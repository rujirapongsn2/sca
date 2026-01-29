/**
 * Tests for Policy Gate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyGate } from '../src/core/policy.js';
import type { PolicyConfig, ToolMetadata } from '../src/types/index.js';

describe('PolicyGate', () => {
  let policyConfig: PolicyConfig;
  let policyGate: PolicyGate;

  beforeEach(() => {
    policyConfig = {
      exec_allowlist: ['pytest*', 'npm test', 'npm run test', 'jest*'],
      path_allowlist: ['.', 'src/**', 'tests/**'],
      path_denylist: ['.env*', 'secrets/**', '*.pem', '*.key'],
      require_confirmation: true,
    };
    policyGate = new PolicyGate(policyConfig);
  });

  describe('Read Access', () => {
    it('should allow read access to normal files', () => {
      const tool: ToolMetadata = {
        name: 'readFile',
        description: 'Read a file',
        risk_level: 'read',
        scope: ['src/index.ts'],
        requires_confirmation: false,
      };

      const result = policyGate.checkTool(tool);
      expect(result.allowed).toBe(true);
      expect(result.requires_confirmation).toBe(false);
    });

    it('should deny read access to .env files', () => {
      const tool: ToolMetadata = {
        name: 'readFile',
        description: 'Read a file',
        risk_level: 'read',
        scope: ['.env'],
        requires_confirmation: false,
      };

      const result = policyGate.checkTool(tool);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denylist');
    });

    it('should deny read access to secret files', () => {
      const tool: ToolMetadata = {
        name: 'readFile',
        description: 'Read a file',
        risk_level: 'read',
        scope: ['secrets/api-key.txt'],
        requires_confirmation: false,
      };

      const result = policyGate.checkTool(tool);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Write Access', () => {
    it('should allow write to allowed paths with confirmation', () => {
      const tool: ToolMetadata = {
        name: 'writeFile',
        description: 'Write a file',
        risk_level: 'write',
        scope: ['src/new-file.ts'],
        requires_confirmation: true,
      };

      const result = policyGate.checkTool(tool);
      expect(result.allowed).toBe(true);
      expect(result.requires_confirmation).toBe(true);
    });

    it('should deny write to denied paths', () => {
      const tool: ToolMetadata = {
        name: 'writeFile',
        description: 'Write a file',
        risk_level: 'write',
        scope: ['.env.local'],
        requires_confirmation: true,
      };

      const result = policyGate.checkTool(tool);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denylist');
    });

    it('should deny write without scope', () => {
      const tool: ToolMetadata = {
        name: 'writeFile',
        description: 'Write a file',
        risk_level: 'write',
        requires_confirmation: true,
      };

      const result = policyGate.checkTool(tool);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('requires explicit scope');
    });
  });

  describe('Exec Access', () => {
    it('should allow commands in allowlist', () => {
      const tool: ToolMetadata = {
        name: 'executeCommand',
        description: 'Execute a command',
        risk_level: 'exec',
        requires_confirmation: true,
      };

      const result = policyGate.checkTool(tool, { command: 'npm test' });
      expect(result.allowed).toBe(true);
      expect(result.requires_confirmation).toBe(true);
    });

    it('should allow commands matching glob patterns', () => {
      const tool: ToolMetadata = {
        name: 'executeCommand',
        description: 'Execute a command',
        risk_level: 'exec',
        requires_confirmation: true,
      };

      const result = policyGate.checkTool(tool, { command: 'pytest tests/' });
      expect(result.allowed).toBe(true);
    });

    it('should deny commands not in allowlist', () => {
      const tool: ToolMetadata = {
        name: 'executeCommand',
        description: 'Execute a command',
        risk_level: 'exec',
        requires_confirmation: true,
      };

      const result = policyGate.checkTool(tool, { command: 'rm -rf /' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in exec allowlist');
    });

    it('should deny exec without command', () => {
      const tool: ToolMetadata = {
        name: 'executeCommand',
        description: 'Execute a command',
        risk_level: 'exec',
        requires_confirmation: true,
      };

      const result = policyGate.checkTool(tool);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('requires command');
    });
  });

  describe('Network Access', () => {
    it('should deny network operations by default', () => {
      const tool: ToolMetadata = {
        name: 'httpRequest',
        description: 'Make HTTP request',
        risk_level: 'network',
        requires_confirmation: true,
      };

      const result = policyGate.checkTool(tool);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Network operations are disabled');
    });
  });
});
