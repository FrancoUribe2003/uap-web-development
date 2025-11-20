import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  const dbPath = path.join(process.cwd(), 'bookadvisor.db');

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA foreign_keys = ON;');

  await initializeTables();

  return db;
}

async function initializeTables() {
  if (!db) return;

  await db.exec(`
    -- Tabla de usuarios (simple para MVP)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabla de libros en lista "Quiero Leer"
    CREATE TABLE IF NOT EXISTS reading_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      priority TEXT CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
      notes TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      
      book_title TEXT NOT NULL,
      book_authors TEXT NOT NULL, 
      book_thumbnail TEXT,
      book_description TEXT,
      book_page_count INTEGER,
      book_categories TEXT, 
      book_published_date TEXT,
      book_average_rating REAL,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, book_id) 
    );

    -- Tabla de libros leídos
    CREATE TABLE IF NOT EXISTS read_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      review TEXT,
      date_finished DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- Cache de información del libro (JSON)
      book_title TEXT NOT NULL,
      book_authors TEXT NOT NULL, -- JSON array
      book_thumbnail TEXT,
      book_description TEXT,
      book_page_count INTEGER,
      book_categories TEXT, -- JSON array
      book_published_date TEXT,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, book_id) -- Un usuario no puede marcar como leído el mismo libro dos veces
    );

    -- Índices para mejorar performance
    CREATE INDEX IF NOT EXISTS idx_reading_list_user ON reading_list(user_id);
    CREATE INDEX IF NOT EXISTS idx_reading_list_priority ON reading_list(user_id, priority);
    CREATE INDEX IF NOT EXISTS idx_read_books_user ON read_books(user_id);
    CREATE INDEX IF NOT EXISTS idx_read_books_date ON read_books(user_id, date_finished);
  `);

  console.log('✅ Base de datos inicializada correctamente');
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
  }
}