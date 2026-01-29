/**
 * Memory Store - SQLite-based local memory storage
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { MemoryEntry, MemoryQuery } from './types.js';
import { logger } from '../utils/logger.js';

export class MemoryStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Better performance

    // Initialize schema
    this.initSchema();

    logger.debug(`Memory store initialized: ${dbPath}`);
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('project', 'user')),
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(type, category, key)
      );

      CREATE INDEX IF NOT EXISTS idx_memory_type ON memory(type);
      CREATE INDEX IF NOT EXISTS idx_memory_category ON memory(category);
      CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key);
      CREATE INDEX IF NOT EXISTS idx_memory_type_category ON memory(type, category);

      CREATE TRIGGER IF NOT EXISTS update_timestamp
      AFTER UPDATE ON memory
      BEGIN
        UPDATE memory SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);
  }

  /**
   * Store a memory entry
   */
  save(entry: MemoryEntry): number {
    const stmt = this.db.prepare(`
      INSERT INTO memory (type, category, key, value, metadata)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(type, category, key) DO UPDATE SET
        value = excluded.value,
        metadata = excluded.metadata
    `);

    const metadata = entry.metadata ? JSON.stringify(entry.metadata) : null;

    const result = stmt.run(entry.type, entry.category, entry.key, entry.value, metadata);

    logger.debug(`Saved memory: ${entry.type}/${entry.category}/${entry.key}`);

    return result.lastInsertRowid as number;
  }

  /**
   * Query memory entries
   */
  query(query: MemoryQuery): MemoryEntry[] {
    let sql = 'SELECT * FROM memory WHERE 1=1';
    const params: any[] = [];

    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }

    if (query.category) {
      sql += ' AND category = ?';
      params.push(query.category);
    }

    if (query.key) {
      sql += ' AND key = ?';
      params.push(query.key);
    }

    if (query.search) {
      sql += ' AND (key LIKE ? OR value LIKE ?)';
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    sql += ' ORDER BY updated_at DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      category: row.category,
      key: row.key,
      value: row.value,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Get a specific memory entry
   */
  get(type: string, category: string, key: string): MemoryEntry | null {
    const results = this.query({ type: type as any, category, key });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Delete memory entries
   */
  delete(query: MemoryQuery): number {
    let sql = 'DELETE FROM memory WHERE 1=1';
    const params: any[] = [];

    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }

    if (query.category) {
      sql += ' AND category = ?';
      params.push(query.category);
    }

    if (query.key) {
      sql += ' AND key = ?';
      params.push(query.key);
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);

    logger.debug(`Deleted ${result.changes} memory entries`);

    return result.changes;
  }

  /**
   * Clear all memory
   */
  clear(type?: 'project' | 'user'): number {
    if (type) {
      return this.delete({ type });
    } else {
      const result = this.db.prepare('DELETE FROM memory').run();
      logger.debug('Cleared all memory');
      return result.changes;
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    total: number;
    project: number;
    user: number;
    categories: Record<string, number>;
  } {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM memory').get() as any;

    const project = this.db
      .prepare("SELECT COUNT(*) as count FROM memory WHERE type = 'project'")
      .get() as any;

    const user = this.db
      .prepare("SELECT COUNT(*) as count FROM memory WHERE type = 'user'")
      .get() as any;

    const categoriesRows = this.db
      .prepare('SELECT category, COUNT(*) as count FROM memory GROUP BY category')
      .all() as any[];

    const categories: Record<string, number> = {};
    categoriesRows.forEach((row) => {
      categories[row.category] = row.count;
    });

    return {
      total: total.count,
      project: project.count,
      user: user.count,
      categories,
    };
  }

  /**
   * Close database
   */
  close(): void {
    this.db.close();
    logger.debug('Memory store closed');
  }
}
