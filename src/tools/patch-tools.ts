/**
 * Patch Tools - Safe diff creation and patch application
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { createTwoFilesPatch, applyPatch as applyDiffPatch, parsePatch } from 'diff';
import type { PolicyGate } from '../core/policy.js';
import { logger } from '../utils/logger.js';
import { mkdirSync } from 'fs';

export interface DiffResult {
  filePath: string;
  oldContent: string;
  newContent: string;
  patch: string;
  hasChanges: boolean;
}

export interface ApplyPatchOptions {
  backup?: boolean;
  dryRun?: boolean;
}

export interface ApplyPatchResult {
  success: boolean;
  filePath: string;
  backupPath?: string;
  error?: string;
}

export class PatchTools {
  constructor(
    private workspaceRoot: string,
    private policyGate?: PolicyGate
  ) {}

  /**
   * Create a diff between old and new content
   */
  createDiff(filePath: string, oldContent: string, newContent: string): DiffResult {
    const patch = createTwoFilesPatch(filePath, filePath, oldContent, newContent, 'original', 'modified');

    return {
      filePath,
      oldContent,
      newContent,
      patch,
      hasChanges: oldContent !== newContent,
    };
  }

  /**
   * Create a diff from file and new content
   */
  createDiffFromFile(filePath: string, newContent: string): DiffResult {
    const fullPath = this.resolvePath(filePath);

    if (!existsSync(fullPath)) {
      // New file
      return this.createDiff(filePath, '', newContent);
    }

    const oldContent = readFileSync(fullPath, 'utf-8');
    return this.createDiff(filePath, oldContent, newContent);
  }

  /**
   * Preview what a patch will do
   */
  previewPatch(diff: DiffResult): string[] {
    const lines: string[] = [];

    if (!diff.hasChanges) {
      lines.push('No changes to apply');
      return lines;
    }

    lines.push(`File: ${diff.filePath}`);
    lines.push('');

    // Parse patch to show affected lines
    const patches = parsePatch(diff.patch);
    if (patches.length > 0) {
      const patch = patches[0];
      lines.push(`Changes: ${patch.hunks.length} hunk(s)`);

      patch.hunks.forEach((hunk, idx) => {
        lines.push(`\nHunk ${idx + 1}: @@ ${hunk.oldStart},${hunk.oldLines} → ${hunk.newStart},${hunk.newLines} @@`);

        // Show changes
        const additions = hunk.lines.filter((l) => l.startsWith('+')).length;
        const deletions = hunk.lines.filter((l) => l.startsWith('-')).length;
        lines.push(`  +${additions} -${deletions}`);
      });
    }

    return lines;
  }

  /**
   * Apply a patch to a file
   */
  async applyPatch(diff: DiffResult, options: ApplyPatchOptions = {}): Promise<ApplyPatchResult> {
    const { backup = true, dryRun = false } = options;
    const fullPath = this.resolvePath(diff.filePath);

    // Policy check
    if (this.policyGate) {
      const checkResult = this.policyGate.checkTool(
        {
          name: 'applyPatch',
          description: `Apply patch to: ${diff.filePath}`,
          risk_level: 'write',
          scope: [diff.filePath],
          requires_confirmation: true,
        }
      );

      if (!checkResult.allowed) {
        return {
          success: false,
          filePath: diff.filePath,
          error: `Policy denied: ${checkResult.reason}`,
        };
      }
    }

    if (!diff.hasChanges) {
      return {
        success: true,
        filePath: diff.filePath,
      };
    }

    // Dry run - just validate
    if (dryRun) {
      try {
        const result = applyDiffPatch(diff.oldContent, diff.patch);
        if (result === false) {
          return {
            success: false,
            filePath: diff.filePath,
            error: 'Patch cannot be applied (conflicts detected)',
          };
        }
        return {
          success: true,
          filePath: diff.filePath,
        };
      } catch (error) {
        return {
          success: false,
          filePath: diff.filePath,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Create backup if requested
    let backupPath: string | undefined;
    if (backup && existsSync(fullPath)) {
      backupPath = `${fullPath}.backup`;
      try {
        copyFileSync(fullPath, backupPath);
        logger.debug(`Backup created: ${backupPath}`);
      } catch (error) {
        return {
          success: false,
          filePath: diff.filePath,
          error: `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    // Apply patch
    try {
      const result = applyDiffPatch(diff.oldContent, diff.patch);

      if (result === false) {
        // Rollback backup if exists
        if (backupPath && existsSync(backupPath)) {
          copyFileSync(backupPath, fullPath);
        }

        return {
          success: false,
          filePath: diff.filePath,
          error: 'Patch cannot be applied (conflicts detected)',
        };
      }

      // Ensure directory exists
      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Write result
      writeFileSync(fullPath, result, 'utf-8');

      logger.success(`Patch applied: ${diff.filePath}`);

      return {
        success: true,
        filePath: diff.filePath,
        backupPath,
      };
    } catch (error) {
      // Rollback backup if exists
      if (backupPath && existsSync(backupPath)) {
        copyFileSync(backupPath, fullPath);
      }

      return {
        success: false,
        filePath: diff.filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply multiple patches
   */
  async applyPatches(diffs: DiffResult[], options: ApplyPatchOptions = {}): Promise<ApplyPatchResult[]> {
    const results: ApplyPatchResult[] = [];

    for (const diff of diffs) {
      const result = await this.applyPatch(diff, options);
      results.push(result);

      // Stop on first failure (unless dry run)
      if (!result.success && !options.dryRun) {
        logger.error(`Failed to apply patch: ${result.error}`);
        break;
      }
    }

    return results;
  }

  /**
   * Resolve path relative to workspace root
   */
  private resolvePath(filePath: string): string {
    return join(this.workspaceRoot, filePath);
  }
}
