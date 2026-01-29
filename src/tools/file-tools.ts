/**
 * File Tools - Safe file operations with policy checks
 */

import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  accessSync,
  constants,
} from 'fs';
import { join, relative, basename } from 'path';
import type { PolicyGate } from '../core/policy.js';
import { logger } from '../utils/logger.js';

export interface FileInfo {
  path: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
  size: number;
  modified: Date;
}

export interface ReadFileOptions {
  encoding?: BufferEncoding;
  maxSize?: number; // in bytes
}

export interface FileTreeOptions {
  maxDepth?: number;
  excludePatterns?: string[];
  includeDotFiles?: boolean;
}

export class FileTools {
  constructor(
    private workspaceRoot: string,
    private policyGate?: PolicyGate
  ) {}

  /**
   * Read file contents
   */
  readFile(filePath: string, options: ReadFileOptions = {}): string {
    const fullPath = this.resolvePath(filePath);
    const { encoding = 'utf-8', maxSize = 10 * 1024 * 1024 } = options; // 10MB default

    // Check if file exists
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check file size
    const stats = statSync(fullPath);
    if (stats.size > maxSize) {
      throw new Error(
        `File too large: ${filePath} (${stats.size} bytes, max ${maxSize} bytes)`
      );
    }

    // Check if it's a regular file
    if (!stats.isFile()) {
      throw new Error(`Not a regular file: ${filePath}`);
    }

    // Policy check (if available)
    if (this.policyGate) {
      const checkResult = this.policyGate.checkTool(
        {
          name: 'readFile',
          description: `Read file: ${filePath}`,
          risk_level: 'read',
          scope: [filePath],
          requires_confirmation: false,
        }
      );

      if (!checkResult.allowed) {
        throw new Error(`Policy denied: ${checkResult.reason}`);
      }
    }

    try {
      return readFileSync(fullPath, encoding);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * List files in directory
   */
  listFiles(dirPath: string = '.', recursive: boolean = false): FileInfo[] {
    const fullPath = this.resolvePath(dirPath);

    if (!existsSync(fullPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const stats = statSync(fullPath);
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`);
    }

    const results: FileInfo[] = [];

    const entries = readdirSync(fullPath);

    for (const entry of entries) {
      const entryPath = join(fullPath, entry);
      const relativePath = relative(this.workspaceRoot, entryPath);

      try {
        const entryStats = statSync(entryPath);

        const fileInfo: FileInfo = {
          path: relativePath,
          type: entryStats.isFile()
            ? 'file'
            : entryStats.isDirectory()
              ? 'directory'
              : entryStats.isSymbolicLink()
                ? 'symlink'
                : 'other',
          size: entryStats.size,
          modified: entryStats.mtime,
        };

        results.push(fileInfo);

        // Recursively list subdirectories
        if (recursive && entryStats.isDirectory()) {
          const subFiles = this.listFiles(relativePath, true);
          results.push(...subFiles);
        }
      } catch (error) {
        // Skip files we can't stat (permission errors, etc.)
        logger.debug(`Skipping ${entryPath}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Get file tree structure
   */
  getFileTree(dirPath: string = '.', options: FileTreeOptions = {}): string {
    const { maxDepth = 3, excludePatterns = ['node_modules', '.git', 'dist', 'build'], includeDotFiles = false } = options;

    const lines: string[] = [];
    const fullPath = this.resolvePath(dirPath);

    const buildTree = (currentPath: string, prefix: string = '', depth: number = 0) => {
      if (depth >= maxDepth) {
        return;
      }

      try {
        const entries = readdirSync(currentPath);
        const filteredEntries = entries.filter((entry) => {
          // Filter dot files
          if (!includeDotFiles && entry.startsWith('.')) {
            return false;
          }

          // Filter excluded patterns
          if (excludePatterns.some((pattern) => entry.includes(pattern))) {
            return false;
          }

          return true;
        });

        filteredEntries.forEach((entry, index) => {
          const isLast = index === filteredEntries.length - 1;
          const entryPath = join(currentPath, entry);

          try {
            const stats = statSync(entryPath);
            const connector = isLast ? '└── ' : '├── ';
            const icon = stats.isDirectory() ? '📁 ' : '📄 ';

            lines.push(`${prefix}${connector}${icon}${entry}`);

            if (stats.isDirectory()) {
              const newPrefix = prefix + (isLast ? '    ' : '│   ');
              buildTree(entryPath, newPrefix, depth + 1);
            }
          } catch (error) {
            // Skip entries we can't stat
            logger.debug(`Skipping ${entryPath}: ${error}`);
          }
        });
      } catch (error) {
        logger.debug(`Cannot read directory ${currentPath}: ${error}`);
      }
    };

    const rootName = basename(fullPath);
    lines.push(`📁 ${rootName}`);
    buildTree(fullPath, '', 0);

    return lines.join('\n');
  }

  /**
   * Search for text in files (simple grep)
   */
  grep(pattern: string | RegExp, dirPath: string = '.', options: { maxResults?: number } = {}): Array<{
    file: string;
    line: number;
    content: string;
  }> {
    const { maxResults = 100 } = options;
    const results: Array<{ file: string; line: number; content: string }> = [];
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'gi') : pattern;

    const files = this.listFiles(dirPath, true).filter((f) => f.type === 'file');

    for (const fileInfo of files) {
      // Skip binary files and large files
      if (fileInfo.size > 1024 * 1024) {
        // Skip files > 1MB
        continue;
      }

      // Skip certain file types
      const ext = fileInfo.path.split('.').pop()?.toLowerCase();
      if (['jpg', 'png', 'gif', 'pdf', 'zip', 'exe', 'bin'].includes(ext || '')) {
        continue;
      }

      try {
        const content = this.readFile(fileInfo.path);
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (regex.test(line)) {
            results.push({
              file: fileInfo.path,
              line: index + 1,
              content: line.trim(),
            });

            if (results.length >= maxResults) {
              return results;
            }
          }
        });
      } catch (error) {
        // Skip files we can't read
        logger.debug(`Skipping ${fileInfo.path}: ${error}`);
      }

      if (results.length >= maxResults) {
        break;
      }
    }

    return results;
  }

  /**
   * Detect tech stack from common files
   */
  detectTechStack(): string[] {
    const techStack: string[] = [];
    const indicators: Record<string, string> = {
      'package.json': 'Node.js/JavaScript',
      'requirements.txt': 'Python',
      'pyproject.toml': 'Python',
      'Cargo.toml': 'Rust',
      'go.mod': 'Go',
      'pom.xml': 'Java/Maven',
      'build.gradle': 'Java/Gradle',
      'Gemfile': 'Ruby',
      'composer.json': 'PHP',
      '.csproj': 'C#/.NET',
      'tsconfig.json': 'TypeScript',
    };

    for (const [file, tech] of Object.entries(indicators)) {
      const fullPath = this.resolvePath(file);
      if (existsSync(fullPath)) {
        techStack.push(tech);
      }
    }

    return [...new Set(techStack)]; // Remove duplicates
  }

  /**
   * Resolve path relative to workspace root
   */
  private resolvePath(filePath: string): string {
    return join(this.workspaceRoot, filePath);
  }
}
