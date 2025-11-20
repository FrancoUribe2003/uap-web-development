export interface GoogleBook {
  id: string;
  title: string;
  authors: string[];
  description: string;
  thumbnail: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  categories: string[];
  averageRating: number | null;
  ratingsCount: number | null;
}

export interface ReadingListItem {
  id: number;
  bookId: string;
  userId: string;
  priority: 'high' | 'medium' | 'low';
  notes: string | null;
  addedAt: Date;
  bookData: GoogleBook; 
}

export interface ReadBookItem {
  id: number;
  bookId: string;
  userId: string;
  rating: number | null; 
  review: string | null;
  dateFinished: Date;
  bookData: GoogleBook;
}

export interface ReadingStats {
  totalBooksRead: number;
  totalPages: number;
  averageRating: number;
  favoriteGenres: { genre: string; count: number }[];
  favoriteAuthors: { author: string; count: number }[];
  booksThisMonth: number;
  booksThisYear: number;
  currentStreak: number; 
}