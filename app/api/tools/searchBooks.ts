import { GoogleBook } from '@/types/books';

interface SearchBooksParams {
  query: string;
  maxResults?: number;
  orderBy?: 'relevance' | 'newest';
}

export async function searchBooks({
  query,
  maxResults = 10,
  orderBy = 'relevance',
}: SearchBooksParams): Promise<GoogleBook[]> {
  
  if (!query || query.trim().length === 0) {
    throw new Error('La búsqueda no puede estar vacía');
  }

  const params = new URLSearchParams({
    q: query,
    maxResults: maxResults.toString(),
    orderBy: orderBy,
    langRestrict: 'es', 
    printType: 'books' 
  });

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.append('key', process.env.GOOGLE_BOOKS_API_KEY);
  }

  const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Books API error:', response.status, errorText);
      throw new Error(`Error en Google Books API: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.volumeInfo?.title || 'Sin título',
      authors: item.volumeInfo?.authors || ['Autor desconocido'],
      description: item.volumeInfo?.description || 'Sin descripción disponible',
      thumbnail: item.volumeInfo?.imageLinks?.thumbnail || 
                 item.volumeInfo?.imageLinks?.smallThumbnail || null,
      publishedDate: item.volumeInfo?.publishedDate || null,
      pageCount: item.volumeInfo?.pageCount || null,
      categories: item.volumeInfo?.categories || [],
      averageRating: item.volumeInfo?.averageRating || null,
      ratingsCount: item.volumeInfo?.ratingsCount || null,
    }));

  } catch (error) {
    console.error('Error en searchBooks:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Error al conectar con Google Books API');
  }
}