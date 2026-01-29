/**
 * Session Manager - Save and restore conversation sessions
 */

import { existsSync, writeFileSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { SessionData, SessionMetadata } from './types.js';
import { logger } from '../utils/logger.js';

export class SessionManager {
  private sessionsDir: string;
  private currentSession: SessionData | null = null;

  constructor(workspaceRoot: string) {
    this.sessionsDir = join(workspaceRoot, '.sca', 'sessions');

    // Ensure directory exists
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }

    logger.debug(`Session manager initialized: ${this.sessionsDir}`);
  }

  /**
   * Create a new session
   */
  createSession(name?: string, workspace?: string): SessionData {
    const id = this.generateSessionId();
    const now = new Date().toISOString();

    this.currentSession = {
      id,
      name,
      created_at: now,
      updated_at: now,
      workspace: workspace || process.cwd(),
      conversation: [],
      context: {},
    };

    logger.debug(`Created session: ${id}`);

    return this.currentSession;
  }

  /**
   * Get current session
   */
  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  /**
   * Add message to current session
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.conversation.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    this.currentSession.updated_at = new Date().toISOString();
  }

  /**
   * Update session context
   */
  updateContext(key: string, value: unknown): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.context[key] = value;
    this.currentSession.updated_at = new Date().toISOString();
  }

  /**
   * Save current session
   */
  save(name?: string): string {
    if (!this.currentSession) {
      throw new Error('No active session to save');
    }

    if (name) {
      this.currentSession.name = name;
    }

    const filename = `${this.currentSession.id}.json`;
    const filepath = join(this.sessionsDir, filename);

    writeFileSync(filepath, JSON.stringify(this.currentSession, null, 2), 'utf-8');

    logger.debug(`Saved session: ${this.currentSession.id}`);

    return filepath;
  }

  /**
   * Load a session
   */
  load(sessionId: string): SessionData {
    const filename = `${sessionId}.json`;
    const filepath = join(this.sessionsDir, filename);

    if (!existsSync(filepath)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const content = readFileSync(filepath, 'utf-8');
    this.currentSession = JSON.parse(content);

    logger.debug(`Loaded session: ${sessionId}`);

    return this.currentSession!;
  }

  /**
   * List all sessions
   */
  listSessions(): SessionMetadata[] {
    if (!existsSync(this.sessionsDir)) {
      return [];
    }

    const files = readdirSync(this.sessionsDir).filter((f) => f.endsWith('.json'));

    const sessions: SessionMetadata[] = [];

    for (const file of files) {
      try {
        const filepath = join(this.sessionsDir, file);
        const content = readFileSync(filepath, 'utf-8');
        const session: SessionData = JSON.parse(content);

        sessions.push({
          id: session.id,
          name: session.name,
          created_at: session.created_at,
          updated_at: session.updated_at,
          workspace: session.workspace,
          message_count: session.conversation.length,
        });
      } catch (error) {
        logger.debug(`Failed to read session: ${file}`);
      }
    }

    // Sort by updated_at (most recent first)
    sessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return sessions;
  }

  /**
   * Delete a session
   */
  delete(sessionId: string): void {
    const filename = `${sessionId}.json`;
    const filepath = join(this.sessionsDir, filename);

    if (existsSync(filepath)) {
      const fs = require('fs');
      fs.unlinkSync(filepath);
      logger.debug(`Deleted session: ${sessionId}`);
    }
  }

  /**
   * Get session summary
   */
  getSummary(): string {
    if (!this.currentSession) {
      return 'No active session';
    }

    const messageCount = this.currentSession.conversation.length;
    const userMessages = this.currentSession.conversation.filter((m) => m.role === 'user').length;
    const assistantMessages = this.currentSession.conversation.filter(
      (m) => m.role === 'assistant'
    ).length;

    return `Session ${this.currentSession.id}: ${messageCount} messages (${userMessages} user, ${assistantMessages} assistant)`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session-${timestamp}-${random}`;
  }
}
