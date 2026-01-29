/**
 * Tests for Audit Logger
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuditLogger } from '../src/security/audit-logger.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { rmSync, existsSync, readFileSync } from 'fs';

describe('AuditLogger', () => {
  let tempDir: string;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    tempDir = join(tmpdir(), `sca-audit-test-${Date.now()}`);
    auditLogger = new AuditLogger(tempDir);
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('log', () => {
    it('should create audit log file', () => {
      auditLogger.log({
        action: 'test:action',
        status: 'success',
      });

      const logPath = auditLogger.getLogPath();
      expect(existsSync(logPath)).toBe(true);
    });

    it('should write JSON log entries', () => {
      auditLogger.log({
        action: 'test:action',
        status: 'success',
        metadata: { key: 'value' },
      });

      const logPath = auditLogger.getLogPath();
      const content = readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(1);

      const entry = JSON.parse(lines[0]);
      expect(entry.action).toBe('test:action');
      expect(entry.status).toBe('success');
      expect(entry.timestamp).toBeDefined();
      expect(entry.metadata).toEqual({ key: 'value' });
    });

    it('should append multiple entries', () => {
      auditLogger.log({ action: 'action1', status: 'success' });
      auditLogger.log({ action: 'action2', status: 'failure' });

      const logPath = auditLogger.getLogPath();
      const content = readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);
    });
  });

  describe('logTool', () => {
    it('should log tool execution', () => {
      auditLogger.logTool('readFile', 'success', { file: 'test.txt' });

      const logPath = auditLogger.getLogPath();
      const content = readFileSync(logPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.action).toBe('tool:readFile');
      expect(entry.status).toBe('success');
      expect(entry.metadata.file).toBe('test.txt');
    });
  });

  describe('logConfirmation', () => {
    it('should log user confirmation', () => {
      auditLogger.logConfirmation('apply_patch', true, { file: 'test.txt' });

      const logPath = auditLogger.getLogPath();
      const content = readFileSync(logPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.action).toBe('confirm:apply_patch');
      expect(entry.status).toBe('success');
      expect(entry.user_confirmed).toBe(true);
    });
  });

  describe('logFileWrite', () => {
    it('should log file write', () => {
      auditLogger.logFileWrite('test.txt', 'success', 'abc123');

      const logPath = auditLogger.getLogPath();
      const content = readFileSync(logPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.action).toBe('file:write');
      expect(entry.metadata.file).toBe('test.txt');
      expect(entry.metadata.diff_hash).toBe('abc123');
    });
  });

  describe('logExec', () => {
    it('should log command execution', () => {
      auditLogger.logExec('npm test', 'success', 0);

      const logPath = auditLogger.getLogPath();
      const content = readFileSync(logPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.action).toBe('exec:command');
      expect(entry.metadata.command).toBe('npm test');
      expect(entry.metadata.exit_code).toBe(0);
    });
  });

  describe('logPolicyViolation', () => {
    it('should log policy violation', () => {
      auditLogger.logPolicyViolation('write', 'Path not in allowlist');

      const logPath = auditLogger.getLogPath();
      const content = readFileSync(logPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.action).toBe('policy:violation:write');
      expect(entry.status).toBe('denied');
      expect(entry.metadata.reason).toBe('Path not in allowlist');
    });
  });

  describe('logAgent', () => {
    it('should log agent action', () => {
      auditLogger.logAgent('task_complete', 'success', { task: 'analyze_code' });

      const logPath = auditLogger.getLogPath();
      const content = readFileSync(logPath, 'utf-8');
      const entry = JSON.parse(content.trim());

      expect(entry.action).toBe('agent:task_complete');
      expect(entry.metadata.task).toBe('analyze_code');
    });
  });
});
