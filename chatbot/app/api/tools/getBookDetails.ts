import { GoogleBook } from '@/types/books';

interface BookDetailsParams {
  bookId: string;
}

export async function getBookDetails({
  bookId
}: BookDetailsParams): Promise<GoogleBook | null> {
  
  if (!bookId || bookId.trim().length === 0) {
    throw new Error('El ID del libro no puede estar vacío');
  }

  const url = `https://www.googleapis.com/books/v1/volumes/${bookId}`;
  
  const params = new URLSearchParams();
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.append('key', process.env.GOOGLE_BOOKS_API_KEY);
  }

  const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 } 
    });

    if (response.status === 404) {
      console.warn(`Libro no encontrado: ${bookId}`);
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Books API error:', response.status, errorText);
      throw new Error(`Error en Google Books API: ${response.status}`);
    }

    const data = await response.json();

    if (!data.volumeInfo) {
      return null;
    }

    return {
      id: data.id,
      title: data.volumeInfo.title || 'Sin título',
      authors: data.volumeInfo.authors || ['Autor desconocido'],
      description: data.volumeInfo.description || 'Sin descripción disponible',
      thumbnail: data.volumeInfo.imageLinks?.thumbnail || 
                 data.volumeInfo.imageLinks?.smallThumbnail || 
                 null,
      publishedDate: data.volumeInfo.publishedDate || null,
      pageCount: data.volumeInfo.pageCount || null,
      categories: data.volumeInfo.categories || [],
      averageRating: data.volumeInfo.averageRating || null,
      ratingsCount: data.volumeInfo.ratingsCount || null,
    };

  } catch (error) {
    console.error('Error en getBookDetails:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Error al obtener detalles del libro desde Google Books API');
  }
}