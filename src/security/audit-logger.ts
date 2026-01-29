/**
 * Audit Logger - Log all critical operations
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { AuditLogEntry } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class AuditLogger {
  private logPath: string;

  constructor(workspaceRoot: string) {
    this.logPath = join(workspaceRoot, '.sca', 'audit', `audit-${this.getDateString()}.log`);

    // Ensure directory exists
    const dir = dirname(this.logPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    logger.debug(`Audit logger initialized: ${this.logPath}`);
  }

  /**
   * Log an audit entry
   */
  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    const logLine = JSON.stringify(fullEntry) + '\n';

    try {
      appendFileSync(this.logPath, logLine, 'utf-8');
      logger.debug(`Audit: ${entry.action} - ${entry.status}`);
    } catch (error) {
      logger.error('Failed to write audit log:', error);
    }
  }

  /**
   * Log tool execution
   */
  logTool(
    toolName: string,
    status: 'success' | 'failure' | 'denied',
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      action: `tool:${toolName}`,
      status,
      metadata,
    });
  }

  /**
   * Log user confirmation
   */
  logConfirmation(action: string, confirmed: boolean, metadata?: Record<string, unknown>): void {
    this.log({
      action: `confirm:${action}`,
      status: confirmed ? 'success' : 'denied',
      user_confirmed: confirmed,
      metadata,
    });
  }

  /**
   * Log file write
   */
  logFileWrite(
    filePath: string,
    status: 'success' | 'failure',
    diffHash?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      action: 'file:write',
      status,
      metadata: {
        ...metadata,
        file: filePath,
        diff_hash: diffHash,
      },
    });
  }

  /**
   * Log command execution
   */
  logExec(
    command: string,
    status: 'success' | 'failure' | 'denied',
    exitCode?: number,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      action: 'exec:command',
      status,
      metadata: {
        ...metadata,
        command,
        exit_code: exitCode,
      },
    });
  }

  /**
   * Log policy violation
   */
  logPolicyViolation(
    action: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      action: `policy:violation:${action}`,
      status: 'denied',
      metadata: {
        ...metadata,
        reason,
      },
    });
  }

  /**
   * Log agent action
   */
  logAgent(
    action: string,
    status: 'success' | 'failure',
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      action: `agent:${action}`,
      status,
      metadata,
    });
  }

  /**
   * Get date string for log file naming
   */
  private getDateString(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get log file path
   */
  getLogPath(): string {
    return this.logPath;
  }
}
