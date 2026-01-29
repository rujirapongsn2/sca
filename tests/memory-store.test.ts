/**
 * Tests for Memory Store
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryStore } from '../src/memory/memory-store.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { rmSync, existsSync } from 'fs';

describe('MemoryStore', () => {
  let tempDb: string;
  let memoryStore: MemoryStore;

  beforeEach(() => {
    tempDb = join(tmpdir(), `sca-memory-test-${Date.now()}.db`);
    memoryStore = new MemoryStore(tempDb);
  });

  afterEach(() => {
    if (memoryStore) {
      memoryStore.close();
    }
    if (existsSync(tempDb)) {
      rmSync(tempDb);
    }
  });

  describe('save and query', () => {
    it('should save and retrieve memory entry', () => {
      const entry = {
        type: 'project' as const,
        category: 'convention',
        key: 'indentation',
        value: '2 spaces',
      };

      const id = memoryStore.save(entry);
      expect(id).toBeGreaterThan(0);

      const results = memoryStore.query({ type: 'project', category: 'convention' });
      expect(results.length).toBe(1);
      expect(results[0].key).toBe('indentation');
      expect(results[0].value).toBe('2 spaces');
    });

    it('should update existing entry on duplicate key', () => {
      const entry = {
        type: 'project' as const,
        category: 'convention',
        key: 'indentation',
        value: '2 spaces',
      };

      memoryStore.save(entry);
      memoryStore.save({ ...entry, value: '4 spaces' });

      const results = memoryStore.query({ key: 'indentation' });
      expect(results.length).toBe(1);
      expect(results[0].value).toBe('4 spaces');
    });

    it('should save metadata', () => {
      const entry = {
        type: 'user' as const,
        category: 'preference',
        key: 'verbosity',
        value: 'high',
        metadata: { source: 'user-input', confidence: 0.9 },
      };

      memoryStore.save(entry);

      const results = memoryStore.query({ key: 'verbosity' });
      expect(results[0].metadata).toEqual({ source: 'user-input', confidence: 0.9 });
    });
  });

  describe('query filters', () => {
    beforeEach(() => {
      // Add test data
      memoryStore.save({
        type: 'project',
        category: 'convention',
        key: 'indentation',
        value: '2 spaces',
      });
      memoryStore.save({
        type: 'project',
        category: 'domain',
        key: 'api-endpoint',
        value: 'https://api.example.com',
      });
      memoryStore.save({
        type: 'user',
        category: 'preference',
        key: 'theme',
        value: 'dark',
      });
    });

    it('should filter by type', () => {
      const results = memoryStore.query({ type: 'project' });
      expect(results.length).toBe(2);
      expect(results.every((r) => r.type === 'project')).toBe(true);
    });

    it('should filter by category', () => {
      const results = memoryStore.query({ category: 'convention' });
      expect(results.length).toBe(1);
      expect(results[0].key).toBe('indentation');
    });

    it('should filter by key', () => {
      const results = memoryStore.query({ key: 'theme' });
      expect(results.length).toBe(1);
      expect(results[0].value).toBe('dark');
    });

    it('should search by text', () => {
      const results = memoryStore.query({ search: 'api' });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit results', () => {
      const results = memoryStore.query({ limit: 1 });
      expect(results.length).toBe(1);
    });
  });

  describe('get', () => {
    it('should get specific entry', () => {
      memoryStore.save({
        type: 'project',
        category: 'convention',
        key: 'indentation',
        value: '2 spaces',
      });

      const entry = memoryStore.get('project', 'convention', 'indentation');
      expect(entry).not.toBeNull();
      expect(entry?.value).toBe('2 spaces');
    });

    it('should return null for non-existent entry', () => {
      const entry = memoryStore.get('project', 'convention', 'nonexistent');
      expect(entry).toBeNull();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      memoryStore.save({
        type: 'project',
        category: 'convention',
        key: 'test1',
        value: 'value1',
      });
      memoryStore.save({
        type: 'project',
        category: 'convention',
        key: 'test2',
        value: 'value2',
      });
    });

    it('should delete by key', () => {
      const count = memoryStore.delete({ key: 'test1' });
      expect(count).toBe(1);

      const remaining = memoryStore.query({});
      expect(remaining.length).toBe(1);
      expect(remaining[0].key).toBe('test2');
    });

    it('should delete by category', () => {
      const count = memoryStore.delete({ category: 'convention' });
      expect(count).toBe(2);

      const remaining = memoryStore.query({});
      expect(remaining.length).toBe(0);
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      memoryStore.save({ type: 'project', category: 'test', key: 'key1', value: 'val1' });
      memoryStore.save({ type: 'user', category: 'test', key: 'key2', value: 'val2' });
    });

    it('should clear specific type', () => {
      const count = memoryStore.clear('project');
      expect(count).toBe(1);

      const remaining = memoryStore.query({});
      expect(remaining.length).toBe(1);
      expect(remaining[0].type).toBe('user');
    });

    it('should clear all memory', () => {
      const count = memoryStore.clear();
      expect(count).toBe(2);

      const remaining = memoryStore.query({});
      expect(remaining.length).toBe(0);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      memoryStore.save({ type: 'project', category: 'convention', key: 'k1', value: 'v1' });
      memoryStore.save({ type: 'project', category: 'convention', key: 'k2', value: 'v2' });
      memoryStore.save({ type: 'project', category: 'domain', key: 'k3', value: 'v3' });
      memoryStore.save({ type: 'user', category: 'preference', key: 'k4', value: 'v4' });
    });

    it('should return correct stats', () => {
      const stats = memoryStore.getStats();

      expect(stats.total).toBe(4);
      expect(stats.project).toBe(3);
      expect(stats.user).toBe(1);
      expect(stats.categories).toEqual({
        convention: 2,
        domain: 1,
        preference: 1,
      });
    });
  });
});
