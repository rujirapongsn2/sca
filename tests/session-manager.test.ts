/**
 * Tests for Session Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../src/session/session-manager.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { rmSync, existsSync } from 'fs';

describe('SessionManager', () => {
  let tempDir: string;
  let sessionManager: SessionManager;

  beforeEach(() => {
    tempDir = join(tmpdir(), `sca-session-test-${Date.now()}`);
    sessionManager = new SessionManager(tempDir);
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const session = sessionManager.createSession('test-session');

      expect(session.id).toBeDefined();
      expect(session.name).toBe('test-session');
      expect(session.conversation).toEqual([]);
      expect(session.context).toEqual({});
    });

    it('should set workspace', () => {
      const session = sessionManager.createSession('test', '/workspace');

      expect(session.workspace).toBe('/workspace');
    });
  });

  describe('addMessage', () => {
    beforeEach(() => {
      sessionManager.createSession();
    });

    it('should add user message', () => {
      sessionManager.addMessage('user', 'Hello');

      const session = sessionManager.getCurrentSession();
      expect(session?.conversation.length).toBe(1);
      expect(session?.conversation[0].role).toBe('user');
      expect(session?.conversation[0].content).toBe('Hello');
    });

    it('should add assistant message', () => {
      sessionManager.addMessage('assistant', 'Hi there');

      const session = sessionManager.getCurrentSession();
      expect(session?.conversation[0].role).toBe('assistant');
      expect(session?.conversation[0].content).toBe('Hi there');
    });

    it('should update timestamp', () => {
      const session1 = sessionManager.getCurrentSession();
      const originalTime = session1?.updated_at;

      // Wait a bit
      setTimeout(() => {
        sessionManager.addMessage('user', 'Test');

        const session2 = sessionManager.getCurrentSession();
        expect(session2?.updated_at).not.toBe(originalTime);
      }, 10);
    });
  });

  describe('updateContext', () => {
    beforeEach(() => {
      sessionManager.createSession();
    });

    it('should update context', () => {
      sessionManager.updateContext('key1', 'value1');
      sessionManager.updateContext('key2', { nested: 'object' });

      const session = sessionManager.getCurrentSession();
      expect(session?.context).toEqual({
        key1: 'value1',
        key2: { nested: 'object' },
      });
    });
  });

  describe('save and load', () => {
    it('should save and load session', () => {
      const session = sessionManager.createSession('saved-session');
      sessionManager.addMessage('user', 'Test message');
      sessionManager.updateContext('test', 'value');

      const filepath = sessionManager.save();
      expect(existsSync(filepath)).toBe(true);

      // Create new manager and load
      const newManager = new SessionManager(tempDir);
      const loaded = newManager.load(session.id);

      expect(loaded.id).toBe(session.id);
      expect(loaded.name).toBe('saved-session');
      expect(loaded.conversation.length).toBe(1);
      expect(loaded.context.test).toBe('value');
    });

    it('should update name when saving', () => {
      sessionManager.createSession();
      sessionManager.save('new-name');

      const session = sessionManager.getCurrentSession();
      expect(session?.name).toBe('new-name');
    });
  });

  describe('listSessions', () => {
    it('should list all sessions', () => {
      sessionManager.createSession('session1');
      sessionManager.save();

      sessionManager.createSession('session2');
      sessionManager.save();

      const sessions = sessionManager.listSessions();
      expect(sessions.length).toBe(2);
      expect(sessions.some((s) => s.name === 'session1')).toBe(true);
      expect(sessions.some((s) => s.name === 'session2')).toBe(true);
    });

    it('should include message count', () => {
      sessionManager.createSession('test');
      sessionManager.addMessage('user', 'msg1');
      sessionManager.addMessage('assistant', 'msg2');
      sessionManager.save();

      const sessions = sessionManager.listSessions();
      expect(sessions[0].message_count).toBe(2);
    });

    it('should sort by updated_at (most recent first)', () => {
      sessionManager.createSession('old');
      sessionManager.save();

      // Wait a bit
      setTimeout(() => {
        sessionManager.createSession('new');
        sessionManager.save();

        const sessions = sessionManager.listSessions();
        expect(sessions[0].name).toBe('new');
      }, 20);
    });
  });

  describe('delete', () => {
    it('should delete session', () => {
      const session = sessionManager.createSession('to-delete');
      const filepath = sessionManager.save();

      expect(existsSync(filepath)).toBe(true);

      sessionManager.delete(session.id);

      expect(existsSync(filepath)).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('should return summary', () => {
      sessionManager.createSession();
      sessionManager.addMessage('user', 'hello');
      sessionManager.addMessage('assistant', 'hi');

      const summary = sessionManager.getSummary();

      expect(summary).toContain('2 messages');
      expect(summary).toContain('1 user');
      expect(summary).toContain('1 assistant');
    });

    it('should handle no active session', () => {
      const summary = sessionManager.getSummary();
      expect(summary).toBe('No active session');
    });
  });
});
