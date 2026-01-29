/**
 * Tests for File Tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileTools } from '../src/tools/file-tools.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileTools', () => {
  let tempDir: string;
  let fileTools: FileTools;

  beforeEach(() => {
    // Create temporary test directory
    tempDir = join(tmpdir(), `sca-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    fileTools = new FileTools(tempDir);

    // Create test files
    mkdirSync(join(tempDir, 'src'));
    mkdirSync(join(tempDir, 'tests'));
    writeFileSync(join(tempDir, 'package.json'), '{"name": "test"}');
    writeFileSync(join(tempDir, 'README.md'), '# Test Project');
    writeFileSync(join(tempDir, 'src', 'index.ts'), 'console.log("hello");');
    writeFileSync(join(tempDir, 'tests', 'test.ts'), 'test("works", () => {});');
  });

  afterEach(() => {
    // Clean up
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('readFile', () => {
    it('should read file contents', () => {
      const content = fileTools.readFile('README.md');
      expect(content).toBe('# Test Project');
    });

    it('should throw error for non-existent file', () => {
      expect(() => fileTools.readFile('does-not-exist.txt')).toThrow('File not found');
    });

    it('should throw error for directory', () => {
      expect(() => fileTools.readFile('src')).toThrow('Not a regular file');
    });
  });

  describe('listFiles', () => {
    it('should list files in directory', () => {
      const files = fileTools.listFiles('.');
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.path.includes('package.json'))).toBe(true);
    });

    it('should list files recursively', () => {
      const files = fileTools.listFiles('.', true);
      expect(files.some((f) => f.path.includes('src'))).toBe(true);
      expect(files.some((f) => f.path.includes('index.ts'))).toBe(true);
    });
  });

  describe('getFileTree', () => {
    it('should generate file tree', () => {
      const tree = fileTools.getFileTree('.');
      expect(tree).toContain('📁');
      expect(tree).toContain('📄');
      expect(tree).toContain('package.json');
    });
  });

  describe('detectTechStack', () => {
    it('should detect Node.js from package.json', () => {
      const techStack = fileTools.detectTechStack();
      expect(techStack).toContain('Node.js/JavaScript');
    });

    it('should detect TypeScript from tsconfig.json', () => {
      writeFileSync(join(tempDir, 'tsconfig.json'), '{}');
      const techStack = fileTools.detectTechStack();
      expect(techStack).toContain('TypeScript');
    });
  });

  describe('grep', () => {
    it('should search for text in files', () => {
      const results = fileTools.grep('hello');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].file).toContain('index.ts');
      expect(results[0].content).toContain('hello');
    });

    it('should support regex patterns', () => {
      const results = fileTools.grep(/console\.\w+/);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit results', () => {
      const results = fileTools.grep('test', '.', { maxResults: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });
});
