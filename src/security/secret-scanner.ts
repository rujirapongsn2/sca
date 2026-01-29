/**
 * Secret Scanner - Detect secrets and PII in text
 */

import { logger } from '../utils/logger.js';

export interface SecretMatch {
  type: string;
  value: string;
  line: number;
  column: number;
  pattern: string;
}

export interface ScanResult {
  hasSecrets: boolean;
  matches: SecretMatch[];
  redactedText?: string;
}

export class SecretScanner {
  private patterns: Array<{ type: string; pattern: RegExp; description: string }>;

  constructor() {
    this.patterns = [
      // API Keys
      {
        type: 'api_key',
        pattern: /\b[A-Za-z0-9_-]{32,}\b/g,
        description: 'Possible API key',
      },
      // AWS Keys
      {
        type: 'aws_access_key',
        pattern: /AKIA[0-9A-Z]{16}/g,
        description: 'AWS Access Key',
      },
      {
        type: 'aws_secret_key',
        pattern: /[A-Za-z0-9/+=]{40}/g,
        description: 'AWS Secret Key',
      },
      // Private keys
      {
        type: 'private_key',
        pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE KEY-----/g,
        description: 'Private Key',
      },
      // Tokens
      {
        type: 'token',
        pattern: /\b(token|auth|bearer)[\s:=]+['"]?([A-Za-z0-9_\-\.]+)['"]?/gi,
        description: 'Authentication Token',
      },
      // Passwords in code
      {
        type: 'password',
        pattern: /\b(password|passwd|pwd)[\s:=]+['"]?([^'"\s]+)['"]?/gi,
        description: 'Password',
      },
      // GitHub tokens
      {
        type: 'github_token',
        pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,
        description: 'GitHub Token',
      },
      // Generic secrets
      {
        type: 'secret',
        pattern: /\b(secret|apikey|api_key)[\s:=]+['"]?([^'"\s]+)['"]?/gi,
        description: 'Secret',
      },
      // Email (PII)
      {
        type: 'email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        description: 'Email address (PII)',
      },
      // Credit card (basic pattern)
      {
        type: 'credit_card',
        pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        description: 'Credit Card number',
      },
    ];
  }

  /**
   * Scan text for secrets
   */
  scan(text: string): ScanResult {
    const matches: SecretMatch[] = [];
    const lines = text.split('\n');

    lines.forEach((line, lineIndex) => {
      this.patterns.forEach((patternDef) => {
        const pattern = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
        let match;

        while ((match = pattern.exec(line)) !== null) {
          // Skip false positives
          if (this.isFalsePositive(match[0], patternDef.type)) {
            continue;
          }

          matches.push({
            type: patternDef.type,
            value: match[0],
            line: lineIndex + 1,
            column: match.index,
            pattern: patternDef.description,
          });
        }
      });
    });

    return {
      hasSecrets: matches.length > 0,
      matches,
    };
  }

  /**
   * Redact secrets from text
   */
  redact(text: string): ScanResult {
    const result = this.scan(text);
    let redactedText = text;

    if (result.hasSecrets) {
      // Sort matches by position (reverse) to maintain indices
      const sortedMatches = [...result.matches].sort((a, b) => {
        if (a.line !== b.line) return b.line - a.line;
        return b.column - a.column;
      });

      const lines = redactedText.split('\n');

      sortedMatches.forEach((match) => {
        const lineIndex = match.line - 1;
        const line = lines[lineIndex];
        const before = line.substring(0, match.column);
        const after = line.substring(match.column + match.value.length);
        const redacted = `[REDACTED_${match.type.toUpperCase()}]`;

        lines[lineIndex] = before + redacted + after;
      });

      redactedText = lines.join('\n');
    }

    return {
      ...result,
      redactedText,
    };
  }

  /**
   * Check if match is a false positive
   */
  private isFalsePositive(value: string, type: string): boolean {
    // Skip common false positives
    const falsePositives = [
      'example.com',
      'test@test.com',
      'user@example.com',
      '1234567890123456', // Test credit card
      'password123', // Example password
      'your_api_key_here',
      'YOUR_SECRET_HERE',
    ];

    const lower = value.toLowerCase();

    // Check against known false positives
    if (falsePositives.some((fp) => lower.includes(fp.toLowerCase()))) {
      return true;
    }

    // Skip placeholder patterns
    if (
      lower.includes('example') ||
      lower.includes('placeholder') ||
      lower.includes('your_') ||
      lower.includes('xxx')
    ) {
      return true;
    }

    // Skip very short matches for certain types
    if (type === 'api_key' && value.length < 20) {
      return true;
    }

    return false;
  }

  /**
   * Check if path should be excluded from scanning
   */
  shouldExclude(path: string): boolean {
    const excludePatterns = [
      '.env',
      'secrets/',
      '.pem',
      '.key',
      'credentials',
      'id_rsa',
      'id_dsa',
      'id_ecdsa',
      'id_ed25519',
    ];

    return excludePatterns.some((pattern) => path.includes(pattern));
  }

  /**
   * Log scan results
   */
  logResults(result: ScanResult, context?: string): void {
    if (result.hasSecrets) {
      logger.warn(`⚠️  Secrets detected${context ? ` in ${context}` : ''}`);
      result.matches.forEach((match) => {
        logger.warn(`  ${match.pattern} at line ${match.line}`);
      });
    }
  }
}
