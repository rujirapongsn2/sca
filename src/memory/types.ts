/**
 * Memory System Types
 */

export interface MemoryEntry {
  id?: number;
  type: 'project' | 'user';
  category: string; // e.g., 'convention', 'preference', 'domain', 'command'
  key: string;
  value: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface MemoryQuery {
  type?: 'project' | 'user';
  category?: string;
  key?: string;
  search?: string;
  limit?: number;
}

export interface MemoryConfig {
  mode: 'off' | 'project' | 'project+user';
  storage_path: string;
}
