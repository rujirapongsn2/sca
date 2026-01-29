/**
 * Tests for Patch Tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PatchTools } from '../src/tools/patch-tools.js';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('PatchTools', () => {
  let tempDir: string;
  let patchTools: PatchTools;

  beforeEach(() => {
    // Create temporary test directory
    tempDir = join(tmpdir(), `sca-patch-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    patchTools = new PatchTools(tempDir);

    // Create test file
    writeFileSync(join(tempDir, 'test.txt'), 'Hello\nWorld\n');
  });

  afterEach(() => {
    // Clean up
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('createDiff', () => {
    it('should create diff between two contents', () => {
      const oldContent = 'Hello\nWorld\n';
      const newContent = 'Hello\nUniverse\n';

      const diff = patchTools.createDiff('test.txt', oldContent, newContent);

      expect(diff.filePath).toBe('test.txt');
      expect(diff.oldContent).toBe(oldContent);
      expect(diff.newContent).toBe(newContent);
      expect(diff.hasChanges).toBe(true);
      expect(diff.patch).toContain('-World');
      expect(diff.patch).toContain('+Universe');
    });

    it('should detect no changes', () => {
      const content = 'Hello\nWorld\n';

      const diff = patchTools.createDiff('test.txt', content, content);

      expect(diff.hasChanges).toBe(false);
    });
  });

  describe('createDiffFromFile', () => {
    it('should create diff from existing file', () => {
      const newContent = 'Hello\nUniverse\n';

      const diff = patchTools.createDiffFromFile('test.txt', newContent);

      expect(diff.hasChanges).toBe(true);
      expect(diff.oldContent).toBe('Hello\nWorld\n');
      expect(diff.newContent).toBe(newContent);
    });

    it('should handle new file', () => {
      const newContent = 'New file content\n';

      const diff = patchTools.createDiffFromFile('new-file.txt', newContent);

      expect(diff.hasChanges).toBe(true);
      expect(diff.oldContent).toBe('');
      expect(diff.newContent).toBe(newContent);
    });
  });

  describe('previewPatch', () => {
    it('should preview patch changes', () => {
      const diff = patchTools.createDiff('test.txt', 'Hello\nWorld\n', 'Hello\nUniverse\n');

      const preview = patchTools.previewPatch(diff);

      expect(preview.length).toBeGreaterThan(0);
      expect(preview[0]).toContain('test.txt');
    });

    it('should show no changes for identical content', () => {
      const diff = patchTools.createDiff('test.txt', 'Hello\n', 'Hello\n');

      const preview = patchTools.previewPatch(diff);

      expect(preview).toContain('No changes to apply');
    });
  });

  describe('applyPatch', () => {
    it('should apply patch successfully', async () => {
      const diff = patchTools.createDiffFromFile('test.txt', 'Hello\nUniverse\n');

      const result = await patchTools.applyPatch(diff);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('test.txt');

      // Verify file was changed
      const newContent = readFileSync(join(tempDir, 'test.txt'), 'utf-8');
      expect(newContent).toBe('Hello\nUniverse\n');
    });

    it('should create backup when applying patch', async () => {
      const diff = patchTools.createDiffFromFile('test.txt', 'Hello\nUniverse\n');

      const result = await patchTools.applyPatch(diff, { backup: true });

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(existsSync(result.backupPath!)).toBe(true);

      // Verify backup has original content
      const backupContent = readFileSync(result.backupPath!, 'utf-8');
      expect(backupContent).toBe('Hello\nWorld\n');
    });

    it('should support dry run', async () => {
      const originalContent = readFileSync(join(tempDir, 'test.txt'), 'utf-8');
      const diff = patchTools.createDiffFromFile('test.txt', 'Hello\nUniverse\n');

      const result = await patchTools.applyPatch(diff, { dryRun: true });

      expect(result.success).toBe(true);

      // Verify file was NOT changed
      const newContent = readFileSync(join(tempDir, 'test.txt'), 'utf-8');
      expect(newContent).toBe(originalContent);
    });

    it('should handle new file creation', async () => {
      const diff = patchTools.createDiffFromFile('new-file.txt', 'New content\n');

      const result = await patchTools.applyPatch(diff);

      expect(result.success).toBe(true);
      expect(existsSync(join(tempDir, 'new-file.txt'))).toBe(true);

      const content = readFileSync(join(tempDir, 'new-file.txt'), 'utf-8');
      expect(content).toBe('New content\n');
    });
  });

  describe('applyPatches', () => {
    it('should apply multiple patches', async () => {
      writeFileSync(join(tempDir, 'file1.txt'), 'Content 1\n');
      writeFileSync(join(tempDir, 'file2.txt'), 'Content 2\n');

      const diffs = [
        patchTools.createDiffFromFile('file1.txt', 'Modified 1\n'),
        patchTools.createDiffFromFile('file2.txt', 'Modified 2\n'),
      ];

      const results = await patchTools.applyPatches(diffs);

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      // Verify files were changed
      expect(readFileSync(join(tempDir, 'file1.txt'), 'utf-8')).toBe('Modified 1\n');
      expect(readFileSync(join(tempDir, 'file2.txt'), 'utf-8')).toBe('Modified 2\n');
    });
  });
});
