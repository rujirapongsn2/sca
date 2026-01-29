/**
 * Git Tools - Git operations and helpers
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

export interface GitStatus {
  isRepo: boolean;
  branch?: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead?: number;
  behind?: number;
}

export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  diff: string;
}

export class GitTools {
  constructor(private workspaceRoot: string) {}

  /**
   * Check if directory is a git repository
   */
  isGitRepo(): boolean {
    const gitDir = join(this.workspaceRoot, '.git');
    return existsSync(gitDir);
  }

  /**
   * Get git status
   */
  getStatus(): GitStatus {
    if (!this.isGitRepo()) {
      return { isRepo: false, staged: [], unstaged: [], untracked: [] };
    }

    try {
      // Get current branch
      const branch = this.exec('git rev-parse --abbrev-ref HEAD').trim();

      // Get status
      const status = this.exec('git status --porcelain');
      const lines = status.split('\n').filter((l) => l.trim());

      const staged: string[] = [];
      const unstaged: string[] = [];
      const untracked: string[] = [];

      lines.forEach((line) => {
        const statusCode = line.substring(0, 2);
        const file = line.substring(3);

        // Staged changes
        if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
          staged.push(file);
        }

        // Unstaged changes
        if (statusCode[1] !== ' ' && statusCode[1] !== '?') {
          unstaged.push(file);
        }

        // Untracked files
        if (statusCode === '??') {
          untracked.push(file);
        }
      });

      // Get ahead/behind info
      let ahead: number | undefined;
      let behind: number | undefined;

      try {
        const aheadBehind = this.exec('git rev-list --left-right --count HEAD...@{u}');
        const [aheadStr, behindStr] = aheadBehind.trim().split('\t');
        ahead = parseInt(aheadStr, 10);
        behind = parseInt(behindStr, 10);
      } catch {
        // No upstream or other error
      }

      return {
        isRepo: true,
        branch,
        staged,
        unstaged,
        untracked,
        ahead,
        behind,
      };
    } catch (error) {
      logger.debug('Failed to get git status:', error);
      return { isRepo: true, staged: [], unstaged: [], untracked: [] };
    }
  }

  /**
   * Get git diff
   */
  getDiff(staged: boolean = false): GitDiff[] {
    if (!this.isGitRepo()) {
      return [];
    }

    try {
      const command = staged ? 'git diff --cached --stat' : 'git diff --stat';
      const statOutput = this.exec(command);

      if (!statOutput.trim()) {
        return [];
      }

      const diffCommand = staged ? 'git diff --cached' : 'git diff';
      const diffOutput = this.exec(diffCommand);

      // Parse stat output
      const lines = statOutput.split('\n').filter((l) => l.trim() && !l.includes('changed'));
      const diffs: GitDiff[] = [];

      lines.forEach((line) => {
        const match = line.match(/(.+?)\s+\|\s+(\d+)\s+([+-]+)/);
        if (match) {
          const file = match[1].trim();
          const changes = match[3];
          const additions = (changes.match(/\+/g) || []).length;
          const deletions = (changes.match(/-/g) || []).length;

          diffs.push({
            file,
            additions,
            deletions,
            diff: this.getFileDiff(file, staged),
          });
        }
      });

      return diffs;
    } catch (error) {
      logger.debug('Failed to get git diff:', error);
      return [];
    }
  }

  /**
   * Get diff for specific file
   */
  private getFileDiff(file: string, staged: boolean): string {
    try {
      const command = staged ? `git diff --cached "${file}"` : `git diff "${file}"`;
      return this.exec(command);
    } catch {
      return '';
    }
  }

  /**
   * Get recent commit messages
   */
  getRecentCommits(count: number = 10): string[] {
    if (!this.isGitRepo()) {
      return [];
    }

    try {
      const output = this.exec(`git log -${count} --pretty=format:"%s"`);
      return output.split('\n').filter((l) => l.trim());
    } catch {
      return [];
    }
  }

  /**
   * Suggest commit message based on changes
   */
  suggestCommitMessage(): string {
    const status = this.getStatus();

    if (!status.isRepo) {
      return '';
    }

    const stagedCount = status.staged.length;

    if (stagedCount === 0) {
      return 'No staged changes';
    }

    // Analyze file types
    const fileTypes = new Set<string>();
    const actions = new Set<string>();

    status.staged.forEach((file) => {
      // Determine file type
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        fileTypes.add('code');
      } else if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
        fileTypes.add('tests');
      } else if (file.endsWith('.md')) {
        fileTypes.add('docs');
      } else if (file.endsWith('.json') || file.endsWith('.yml')) {
        fileTypes.add('config');
      }

      // Determine action (from git status codes would be better, but this is simplified)
      actions.add('update');
    });

    // Build message
    let message = '';

    if (fileTypes.has('tests')) {
      message = 'test: ';
    } else if (fileTypes.has('docs')) {
      message = 'docs: ';
    } else if (fileTypes.has('config')) {
      message = 'chore: ';
    } else {
      message = 'feat: ';
    }

    // Add description
    if (stagedCount === 1) {
      message += `update ${status.staged[0]}`;
    } else {
      message += `update ${stagedCount} files`;
    }

    return message;
  }

  /**
   * Execute git command
   */
  private exec(command: string): string {
    return execSync(command, {
      cwd: this.workspaceRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }
}
