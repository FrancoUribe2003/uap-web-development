import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { searchBooks } from '../tools/searchBooks';
import { getBookDetails } from '../tools/getBookDetails';
import {
  addToReadingList,
  getReadingList,
  markAsRead,
  getReadingStats,
} from '@/lib/db-operations';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 API route iniciada');
    
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY no configurada');
      return new Response('Server configuration error', { status: 500 });
    }

    const { messages } = await req.json();
    console.log('📨 Mensajes recibidos:', messages?.length);

    if (!messages || !Array.isArray(messages)) {
      console.error('Messages no es array:', typeof messages);
      return new Response('Messages are required', { status: 400 });
    }

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      if (!message.content || typeof message.content !== 'string') {
        console.error(`Mensaje ${i} inválido`);
        return new Response(`Invalid message format at index ${i}`, { status: 400 });
      }
      
      if (message.role === 'user' && message.content.length > 1000) {
        console.error(`Mensaje muy largo:`, message.content.length);
        return new Response(`Message too long`, { status: 400 });
      }

      if (!['user', 'assistant', 'system'].includes(message.role)) {
        console.error(`Role inválido:`, message.role);
        return new Response(`Invalid role at index ${i}`, { status: 400 });
      }
    }

    console.log('✅ Validaciones pasaron');

    const userId = 'demo-user';

    const result = await streamText({
      model: openrouter(
        process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free'
      ),
      messages,
      system: `Eres BookAdvisor. Ayudas a descubrir libros, organizar listas de lectura y ver estadísticas.

REGLAS:
- USA las tools, NO inventes libros
- searchBooks: cuando busquen libros
- getBookDetails: para info detallada
- addToReadingList: cuando quieran agregar
- getReadingList: para ver su lista
- markAsRead: cuando terminen un libro
- getReadingStats: para estadísticas`,

      tools: {
        searchBooks: tool({
          description: 'Busca libros en Google Books por título, autor o tema',
          parameters: z.object({
            query: z.string().describe('Término de búsqueda'),
            maxResults: z.number().optional().default(10),
            orderBy: z.enum(['relevance', 'newest']).optional().default('relevance'),
          }),
          execute: async ({ query, maxResults, orderBy }) => {
            console.log(`🔍 searchBooks: "${query}"`); 
            
            try {
              const books = await searchBooks({ query, maxResults, orderBy });
              
              return {
                success: true,
                count: books.length,
                books: books.map(b => ({
                  id: b.id,
                  title: b.title,
                  authors: b.authors,
                  description: b.description.substring(0, 200),
                  thumbnail: b.thumbnail,
                  pageCount: b.pageCount,
                  averageRating: b.averageRating,
                })),
              };
            } catch (error) {
              console.error('Error searchBooks:', error);
              return { success: false, message: 'Error al buscar' };
            }
          },
        }),

        getBookDetails: tool({
          description: 'Info detallada de un libro específico',
          parameters: z.object({
            bookId: z.string().describe('ID del libro'),
          }),
          execute: async ({ bookId }) => {
            console.log(`📖 getBookDetails: ${bookId}`);
            
            try {
              const book = await getBookDetails({ bookId });
              if (!book) return { success: false, message: 'No encontrado' };
              return { success: true, book };
            } catch (error) {
              return { success: false, message: 'Error' };
            }
          },
        }),

        addToReadingList: tool({
          description: 'Agrega libro a lista "Quiero Leer"',
          parameters: z.object({
            bookId: z.string(),
            bookTitle: z.string(),
            bookAuthors: z.array(z.string()),
            bookThumbnail: z.string().nullable().optional(),
            bookDescription: z.string().optional(),
            bookPageCount: z.number().nullable().optional(),
            bookCategories: z.array(z.string()).optional(),
            bookPublishedDate: z.string().nullable().optional(),
            bookAverageRating: z.number().nullable().optional(),
            priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
            notes: z.string().optional(),
          }),
          execute: async (params) => {
            console.log(`➕ addToReadingList: "${params.bookTitle}"`);
            
            try {
              const book = {
                id: params.bookId,
                title: params.bookTitle,
                authors: params.bookAuthors,
                thumbnail: params.bookThumbnail || null,
                description: params.bookDescription || '',
                pageCount: params.bookPageCount || null,
                categories: params.bookCategories || [],
                publishedDate: params.bookPublishedDate || null,
                averageRating: params.bookAverageRating || null,
                ratingsCount: null,
              };

              await addToReadingList(userId, book, params.priority, params.notes);
              return { success: true, message: `"${params.bookTitle}" agregado ✅` };
            } catch (error: any) {
              if (error.message?.includes('UNIQUE')) {
                return { success: false, message: 'Ya está en tu lista' };
              }
              return { success: false, message: 'Error al agregar' };
            }
          },
        }),

        getReadingList: tool({
          description: 'Obtiene libros pendientes',
          parameters: z.object({
            priority: z.enum(['high', 'medium', 'low']).optional(),
            limit: z.number().optional(),
          }),
          execute: async ({ priority, limit }) => {
            console.log(`📚 getReadingList`);
            
            try {
              const books = await getReadingList(userId, { priority, limit });

              return {
                success: true,
                count: books.length,
                books: books.map(item => ({
                  id: item.bookId,
                  title: item.bookData.title,
                  authors: item.bookData.authors,
                  thumbnail: item.bookData.thumbnail,
                  priority: item.priority,
                  notes: item.notes,
                  addedAt: item.addedAt,
                })),
              };
            } catch (error) {
              return { success: false, message: 'Error' };
            }
          },
        }),

        markAsRead: tool({
          description: 'Marca libro como leído',
          parameters: z.object({
            bookId: z.string(),
            rating: z.number().min(1).max(5).optional(),
            review: z.string().optional(),
          }),
          execute: async ({ bookId, rating, review }) => {
            console.log(`✅ markAsRead`);
            
            try {
              await markAsRead(userId, bookId, rating, review);
              return {
                success: true,
                message: rating ? `¡Completado con ${rating}⭐!` : '¡Felicitaciones! 🎉',
              };
            } catch (error: any) {
              if (error.message?.includes('no está en tu lista')) {
                return { success: false, message: 'Agrégalo primero' };
              }
              return { success: false, message: 'Error' };
            }
          },
        }),

        getReadingStats: tool({
          description: 'Estadísticas de lectura',
          parameters: z.object({
            period: z.enum(['all-time', 'year', 'month', 'week']).optional().default('all-time'),
          }),
          execute: async ({ period }) => {
            console.log(`📊 getReadingStats: ${period}`);
            
            try {
              const stats = await getReadingStats(userId, period);

              return {
                success: true,
                stats: {
                  totalBooks: stats.totalBooksRead,
                  totalPages: stats.totalPages,
                  avgRating: stats.averageRating,
                  topGenres: stats.favoriteGenres.slice(0, 3),
                  topAuthors: stats.favoriteAuthors.slice(0, 3),
                  thisMonth: stats.booksThisMonth,
                  thisYear: stats.booksThisYear,
                  streak: stats.currentStreak,
                },
              };
            } catch (error) {
              return { success: false, message: 'Error' };
            }
          },
        }),
      },

      maxSteps: 5,
    });

    console.log('✅ Streaming iniciado');
    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error('💥 Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Error: ${message}`, { status: 500 });
  }
}