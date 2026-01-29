/**
 * Tests for Secret Scanner
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecretScanner } from '../src/security/secret-scanner.js';

describe('SecretScanner', () => {
  let scanner: SecretScanner;

  beforeEach(() => {
    scanner = new SecretScanner();
  });

  describe('scan', () => {
    it('should detect API keys', () => {
      const text = 'const apiKey = "sk_test_FakeKey1234567890abcdefghijklmnopqrstuv";';
      const result = scanner.scan(text);

      expect(result.hasSecrets).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should detect AWS keys', () => {
      const text = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7REALKEY';
      const result = scanner.scan(text);

      expect(result.hasSecrets).toBe(true);
      expect(result.matches.some((m) => m.type === 'aws_access_key')).toBe(true);
    });

    it('should detect private keys', () => {
      const text = '-----BEGIN RSA PRIVATE KEY-----';
      const result = scanner.scan(text);

      expect(result.hasSecrets).toBe(true);
      expect(result.matches.some((m) => m.type === 'private_key')).toBe(true);
    });

    it('should detect passwords', () => {
      const text = 'const password = "MySecretPass123";';
      const result = scanner.scan(text);

      expect(result.hasSecrets).toBe(true);
      expect(result.matches.some((m) => m.type === 'password')).toBe(true);
    });

    it('should detect GitHub tokens', () => {
      const text = 'GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const result = scanner.scan(text);

      expect(result.hasSecrets).toBe(true);
      expect(result.matches.some((m) => m.type === 'github_token')).toBe(true);
    });

    it('should detect emails (PII)', () => {
      const text = 'Contact: john.doe@company.com';
      const result = scanner.scan(text);

      expect(result.hasSecrets).toBe(true);
      expect(result.matches.some((m) => m.type === 'email')).toBe(true);
    });

    it('should not detect false positives', () => {
      const text = `
        const example = "your_api_key_here";
        const test = "test@test.com";
        const placeholder = "example.com";
      `;
      const result = scanner.scan(text);

      // Should filter out common placeholders
      expect(result.matches.length).toBe(0);
    });

    it('should detect multiple secrets', () => {
      const text = `
        GITHUB_TOKEN=ghp_FakeToken1234567890abcdefghijk
        PASSWORD=SecretPass123
        AWS_KEY=AKIAFAKEKEY12345ABCD
      `;
      const result = scanner.scan(text);

      expect(result.hasSecrets).toBe(true);
      expect(result.matches.length).toBeGreaterThan(1);
    });

    it('should provide line and column information', () => {
      const text = 'First line\nconst secret = "SECRET123";\nThird line';
      const result = scanner.scan(text);

      expect(result.hasSecrets).toBe(true);
      expect(result.matches[0].line).toBe(2);
      expect(result.matches[0].column).toBeGreaterThan(0);
    });
  });

  describe('redact', () => {
    it('should redact secrets', () => {
      const text = 'const apiKey = "sk_test_FakeKey1234567890abcdefghijklmnopqrstuv";';
      const result = scanner.redact(text);

      expect(result.hasSecrets).toBe(true);
      expect(result.redactedText).toContain('[REDACTED_');
      expect(result.redactedText).not.toContain('sk_test_');
    });

    it('should preserve original text structure', () => {
      const text = 'Line 1\nconst secret = "SECRET";\nLine 3';
      const result = scanner.redact(text);

      const lines = result.redactedText!.split('\n');
      expect(lines.length).toBe(3);
      expect(lines[0]).toBe('Line 1');
      expect(lines[2]).toBe('Line 3');
    });

    it('should return original text if no secrets', () => {
      const text = 'const value = "normal_value";';
      const result = scanner.redact(text);

      expect(result.hasSecrets).toBe(false);
      expect(result.redactedText).toBe(text);
    });
  });

  describe('shouldExclude', () => {
    it('should exclude sensitive file paths', () => {
      expect(scanner.shouldExclude('.env')).toBe(true);
      expect(scanner.shouldExclude('secrets/api-key.txt')).toBe(true);
      expect(scanner.shouldExclude('config.pem')).toBe(true);
      expect(scanner.shouldExclude('private.key')).toBe(true);
      expect(scanner.shouldExclude('~/.ssh/id_rsa')).toBe(true);
    });

    it('should not exclude normal paths', () => {
      expect(scanner.shouldExclude('src/index.ts')).toBe(false);
      expect(scanner.shouldExclude('README.md')).toBe(false);
      expect(scanner.shouldExclude('package.json')).toBe(false);
    });
  });
});
