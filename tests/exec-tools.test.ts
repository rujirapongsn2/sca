/**
 * Tests for Exec Tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExecTools } from '../src/tools/exec-tools.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';

describe('ExecTools', () => {
  let tempDir: string;
  let execTools: ExecTools;

  beforeEach(() => {
    tempDir = join(tmpdir(), `sca-exec-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    execTools = new ExecTools(tempDir);
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('execute', () => {
    it('should execute simple command successfully', async () => {
      const result = await execTools.execute('echo "Hello World"');

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello World');
      expect(result.command).toBe('echo "Hello World"');
    });

    it('should handle command failure', async () => {
      const result = await execTools.execute('exit 1');

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should capture stderr', async () => {
      const result = await execTools.execute('echo "error" >&2');

      expect(result.stderr).toContain('error');
    });

    it('should respect cwd option', async () => {
      const result = await execTools.execute('pwd', { cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain(tempDir);
    });

    it('should timeout long-running commands', async () => {
      const result = await execTools.execute('sleep 10', { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);
  });

  describe('isSafeCommand', () => {
    it('should detect safe commands', () => {
      expect(execTools.isSafeCommand('npm test')).toBe(true);
      expect(execTools.isSafeCommand('echo hello')).toBe(true);
      expect(execTools.isSafeCommand('ls -la')).toBe(true);
    });

    it('should detect dangerous commands', () => {
      expect(execTools.isSafeCommand('rm -rf /')).toBe(false);
      expect(execTools.isSafeCommand('format c:')).toBe(false);
      expect(execTools.isSafeCommand('chmod -R 777 /')).toBe(false);
    });
  });

  describe('executePreset', () => {
    it('should execute command preset', async () => {
      const presets = {
        test: {
          description: 'Run tests',
          command: 'echo "Running tests"',
        },
      };

      const result = await execTools.executePreset('test', presets);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Running tests');
    });

    it('should return error for unknown preset', async () => {
      const result = await execTools.executePreset('unknown', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Preset not found');
    });
  });
});
