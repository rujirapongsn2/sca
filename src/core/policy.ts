/**
 * Policy Gate - Security layer for all risky operations
 */

import { minimatch } from 'minimatch';
import type { RiskLevel, ToolMetadata, PolicyConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  requires_confirmation: boolean;
}

export class PolicyGate {
  constructor(private policyConfig: PolicyConfig) {}

  /**
   * Check if a tool operation is allowed by policy
   */
  checkTool(tool: ToolMetadata, context?: Record<string, unknown>): PolicyCheckResult {
    const { risk_level, scope, requires_confirmation } = tool;

    // Check based on risk level
    switch (risk_level) {
      case 'read':
        return this.checkReadAccess(scope);

      case 'write':
        return this.checkWriteAccess(scope);

      case 'exec':
        return this.checkExecAccess(context);

      case 'network':
        return this.checkNetworkAccess();

      default:
        return {
          allowed: false,
          reason: `Unknown risk level: ${risk_level}`,
          requires_confirmation: true,
        };
    }
  }

  /**
   * Check read access
   */
  private checkReadAccess(scope?: string[]): PolicyCheckResult {
    if (!scope || scope.length === 0) {
      return { allowed: true, requires_confirmation: false };
    }

    // Check if any path is in denylist
    for (const path of scope) {
      if (this.isPathDenied(path)) {
        return {
          allowed: false,
          reason: `Path '${path}' is in denylist`,
          requires_confirmation: true,
        };
      }
    }

    return { allowed: true, requires_confirmation: false };
  }

  /**
   * Check write access
   */
  private checkWriteAccess(scope?: string[]): PolicyCheckResult {
    if (!scope || scope.length === 0) {
      return {
        allowed: false,
        reason: 'Write operation requires explicit scope',
        requires_confirmation: true,
      };
    }

    // Check if paths are allowed
    for (const path of scope) {
      if (this.isPathDenied(path)) {
        return {
          allowed: false,
          reason: `Cannot write to '${path}': path is in denylist`,
          requires_confirmation: true,
        };
      }

      if (!this.isPathAllowed(path)) {
        return {
          allowed: false,
          reason: `Cannot write to '${path}': path is not in allowlist`,
          requires_confirmation: true,
        };
      }
    }

    // Write operations always require confirmation (unless disabled in policy)
    return {
      allowed: true,
      requires_confirmation: this.policyConfig.require_confirmation,
    };
  }

  /**
   * Check exec access
   */
  private checkExecAccess(context?: Record<string, unknown>): PolicyCheckResult {
    const command = context?.command as string | undefined;

    if (!command) {
      return {
        allowed: false,
        reason: 'Exec operation requires command in context',
        requires_confirmation: true,
      };
    }

    // Check against allowlist
    const isAllowed = this.isCommandAllowed(command);

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Command '${command}' is not in exec allowlist`,
        requires_confirmation: true,
      };
    }

    // Exec operations always require confirmation
    return {
      allowed: true,
      requires_confirmation: this.policyConfig.require_confirmation,
    };
  }

  /**
   * Check network access
   */
  private checkNetworkAccess(): PolicyCheckResult {
    // Network operations are denied by default in local-first mode
    return {
      allowed: false,
      reason: 'Network operations are disabled in local-first mode',
      requires_confirmation: true,
    };
  }

  /**
   * Check if path is in denylist
   */
  private isPathDenied(path: string): boolean {
    return this.policyConfig.path_denylist.some((pattern) => minimatch(path, pattern));
  }

  /**
   * Check if path is in allowlist
   */
  private isPathAllowed(path: string): boolean {
    // If no allowlist, deny by default
    if (this.policyConfig.path_allowlist.length === 0) {
      return false;
    }

    return this.policyConfig.path_allowlist.some((pattern) => minimatch(path, pattern));
  }

  /**
   * Check if command matches allowlist patterns
   */
  private isCommandAllowed(command: string): boolean {
    // Extract base command (first word)
    const baseCommand = command.trim().split(/\s+/)[0];

    return this.policyConfig.exec_allowlist.some((pattern) => {
      // Support glob patterns
      if (pattern.includes('*')) {
        return minimatch(baseCommand, pattern);
      }
      // Exact match
      return baseCommand === pattern || command.startsWith(pattern);
    });
  }

  /**
   * Update policy configuration
   */
  updatePolicy(newPolicy: Partial<PolicyConfig>): void {
    Object.assign(this.policyConfig, newPolicy);
    logger.debug('Policy configuration updated');
  }
}
