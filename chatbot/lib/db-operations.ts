import { getDatabase } from './db';
import { GoogleBook, ReadingListItem, ReadBookItem, ReadingStats } from '@/types/books';

//TOOL 1: searchBooks - No requiere DB, usa Google Books API

//TOOL 2: getBookDetails - No requiere DB, usa Google Books API

//TOOL 3: addToReadingList Agrega un libro a la lista "Quiero Leer"
export async function addToReadingList(
  userId: string,
  book: GoogleBook,
  priority: 'high' | 'medium' | 'low' = 'medium',
  notes?: string
): Promise<ReadingListItem> {
  const db = await getDatabase();

  // Asegurar que el usuario existe
  await db.run('INSERT OR IGNORE INTO users (id) VALUES (?)', userId);

  // Insertar libro en reading list
  const result = await db.run(
    `INSERT INTO reading_list (
      user_id, book_id, priority, notes,
      book_title, book_authors, book_thumbnail, book_description,
      book_page_count, book_categories, book_published_date, book_average_rating
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    book.id,
    priority,
    notes || null,
    book.title,
    JSON.stringify(book.authors),
    book.thumbnail,
    book.description,
    book.pageCount,
    JSON.stringify(book.categories),
    book.publishedDate,
    book.averageRating
  );

  // Retornar el item creado
  return {
    id: result.lastID!,
    bookId: book.id,
    userId,
    priority,
    notes: notes || null,
    addedAt: new Date(),
    bookData: book,
  };
}

//TOOL 4: getReadingList Obtiene la lista de libros "Quiero Leer"
export async function getReadingList(
  userId: string,
  filter?: {
    priority?: 'high' | 'medium' | 'low';
    limit?: number;
  }
): Promise<ReadingListItem[]> {
  const db = await getDatabase();

  let query = `
    SELECT * FROM reading_list 
    WHERE user_id = ?
  `;
  const params: any[] = [userId];

  if (filter?.priority) {
    query += ' AND priority = ?';
    params.push(filter.priority);
  }

  query += ' ORDER BY added_at DESC';

  if (filter?.limit) {
    query += ' LIMIT ?';
    params.push(filter.limit);
  }

  const rows = await db.all(query, ...params);

  return rows.map((row: any) => ({
    id: row.id,
    bookId: row.book_id,
    userId: row.user_id,
    priority: row.priority,
    notes: row.notes,
    addedAt: new Date(row.added_at),
    bookData: {
      id: row.book_id,
      title: row.book_title,
      authors: JSON.parse(row.book_authors),
      description: row.book_description,
      thumbnail: row.book_thumbnail,
      pageCount: row.book_page_count,
      categories: JSON.parse(row.book_categories),
      publishedDate: row.book_published_date,
      averageRating: row.book_average_rating,
      ratingsCount: null,
    },
  }));
}

//TOOL 5: markAsRead Marca un libro como leído y lo mueve de reading_list a read_books
export async function markAsRead(
  userId: string,
  bookId: string,
  rating?: number,
  review?: string,
  dateFinished?: Date
): Promise<ReadBookItem> {
  const db = await getDatabase();

  // Validar rating
  if (rating && (rating < 1 || rating > 5)) {
    throw new Error('El rating debe estar entre 1 y 5');
  }

  // Buscar el libro en reading_list
  const bookInList = await db.get(
    'SELECT * FROM reading_list WHERE user_id = ? AND book_id = ?',
    userId,
    bookId
  );

  if (!bookInList) {
    throw new Error('El libro no está en tu lista de lectura');
  }

  // Insertar en read_books
  const result = await db.run(
    `INSERT INTO read_books (
      user_id, book_id, rating, review, date_finished,
      book_title, book_authors, book_thumbnail, book_description,
      book_page_count, book_categories, book_published_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId,
    bookId,
    rating || null,
    review || null,
    dateFinished ? dateFinished.toISOString() : new Date().toISOString(),
    bookInList.book_title,
    bookInList.book_authors,
    bookInList.book_thumbnail,
    bookInList.book_description,
    bookInList.book_page_count,
    bookInList.book_categories,
    bookInList.book_published_date
  );

  // Eliminar de reading_list
  await db.run(
    'DELETE FROM reading_list WHERE user_id = ? AND book_id = ?',
    userId,
    bookId
  );

  return {
    id: result.lastID!,
    bookId,
    userId,
    rating: rating || null,
    review: review || null,
    dateFinished: dateFinished || new Date(),
    bookData: {
      id: bookId,
      title: bookInList.book_title,
      authors: JSON.parse(bookInList.book_authors),
      description: bookInList.book_description,
      thumbnail: bookInList.book_thumbnail,
      pageCount: bookInList.book_page_count,
      categories: JSON.parse(bookInList.book_categories),
      publishedDate: bookInList.book_published_date,
      averageRating: bookInList.book_average_rating,
      ratingsCount: null,
    },
  };
}

//TOOL 6: getReadingStats Genera estadísticas de lectura del usuario
export async function getReadingStats(
  userId: string,
  period: 'all-time' | 'year' | 'month' | 'week' = 'all-time'
): Promise<ReadingStats> {
  const db = await getDatabase();

  // Calcular fecha de inicio según el periodo
  let dateFilter = '';
  const now = new Date();
  
  if (period === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    dateFilter = `AND date_finished >= '${startOfYear.toISOString()}'`;
  } else if (period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = `AND date_finished >= '${startOfMonth.toISOString()}'`;
  } else if (period === 'week') {
    const startOfWeek = new Date(now.setDate(now.getDate() - 7));
    dateFilter = `AND date_finished >= '${startOfWeek.toISOString()}'`;
  }

  // Total de libros leídos
  const totalBooksResult = await db.get(
    `SELECT COUNT(*) as count FROM read_books WHERE user_id = ? ${dateFilter}`,
    userId
  );

  // Total de páginas leídas
  const totalPagesResult = await db.get(
    `SELECT SUM(book_page_count) as total FROM read_books WHERE user_id = ? ${dateFilter}`,
    userId
  );

  // Rating promedio
  const avgRatingResult = await db.get(
    `SELECT AVG(rating) as avg FROM read_books WHERE user_id = ? AND rating IS NOT NULL ${dateFilter}`,
    userId
  );

  // Géneros favoritos
  const genresResult = await db.all(
    `SELECT book_categories FROM read_books WHERE user_id = ? ${dateFilter}`,
    userId
  );

  const genreCounts: { [key: string]: number } = {};
  genresResult.forEach((row: any) => {
    const categories = JSON.parse(row.book_categories);
    categories.forEach((cat: string) => {
      genreCounts[cat] = (genreCounts[cat] || 0) + 1;
    });
  });

  const favoriteGenres = Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Autores favoritos
  const authorsResult = await db.all(
    `SELECT book_authors FROM read_books WHERE user_id = ? ${dateFilter}`,
    userId
  );

  const authorCounts: { [key: string]: number } = {};
  authorsResult.forEach((row: any) => {
    const authors = JSON.parse(row.book_authors);
    authors.forEach((author: string) => {
      authorCounts[author] = (authorCounts[author] || 0) + 1;
    });
  });

  const favoriteAuthors = Object.entries(authorCounts)
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Libros este mes
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const booksThisMonthResult = await db.get(
    `SELECT COUNT(*) as count FROM read_books WHERE user_id = ? AND date_finished >= ?`,
    userId,
    startOfMonth.toISOString()
  );

  // Libros este año
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const booksThisYearResult = await db.get(
    `SELECT COUNT(*) as count FROM read_books WHERE user_id = ? AND date_finished >= ?`,
    userId,
    startOfYear.toISOString()
  );

  // Racha actual (días consecutivos leyendo)
  const currentStreak = await calculateStreak(userId);

  return {
    totalBooksRead: totalBooksResult.count || 0,
    totalPages: totalPagesResult.total || 0,
    averageRating: avgRatingResult.avg ? parseFloat(avgRatingResult.avg.toFixed(2)) : 0,
    favoriteGenres,
    favoriteAuthors,
    booksThisMonth: booksThisMonthResult.count || 0,
    booksThisYear: booksThisYearResult.count || 0,
    currentStreak,
  };
}

/**
 * Helper: Calcular racha de días consecutivos leyendo
 */
async function calculateStreak(userId: string): Promise<number> {
  const db = await getDatabase();

  const books = await db.all(
    `SELECT date_finished FROM read_books 
     WHERE user_id = ? 
     ORDER BY date_finished DESC`,
    userId
  );

  if (books.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const book of books) {
    const bookDate = new Date(book.date_finished);
    bookDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((currentDate.getTime() - bookDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
    } else if (diffDays > streak) {
      break;
    }
  }

  return streak;
}

/**
 * Helper: Eliminar libro de reading list
 */
export async function removeFromReadingList(userId: string, bookId: string): Promise<void> {
  const db = await getDatabase();
  
  await db.run(
    'DELETE FROM reading_list WHERE user_id = ? AND book_id = ?',
    userId,
    bookId
  );
}