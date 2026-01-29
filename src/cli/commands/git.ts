/**
 * Git command - Git operations and helpers
 */

import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { GitTools } from '../../tools/git-tools.js';

export async function gitCommand(
  action: 'status' | 'diff' | 'suggest',
  options: { staged?: boolean } = {}
): Promise<void> {
  try {
    const gitTools = new GitTools(process.cwd());

    if (!gitTools.isGitRepo()) {
      logger.error('Not a git repository');
      process.exit(1);
    }

    switch (action) {
      case 'status':
        await showStatus(gitTools);
        break;

      case 'diff':
        await showDiff(gitTools, options.staged || false);
        break;

      case 'suggest':
        await suggestCommit(gitTools);
        break;

      default:
        logger.error(`Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (error) {
    logger.error('Git command failed:');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}

async function showStatus(gitTools: GitTools): Promise<void> {
  const status = gitTools.getStatus();

  logger.log(chalk.bold('Git Status:'));
  logger.log('');

  if (status.branch) {
    logger.log(`Branch: ${chalk.cyan(status.branch)}`);

    if (status.ahead || status.behind) {
      const parts = [];
      if (status.ahead) parts.push(`${chalk.green(`ahead ${status.ahead}`)}`);
      if (status.behind) parts.push(`${chalk.red(`behind ${status.behind}`)}`);
      logger.log(`Status: ${parts.join(', ')}`);
    }

    logger.log('');
  }

  if (status.staged.length > 0) {
    logger.log(chalk.bold.green('Staged changes:'));
    status.staged.forEach((file) => {
      logger.log(`  ${chalk.green('✓')} ${file}`);
    });
    logger.log('');
  }

  if (status.unstaged.length > 0) {
    logger.log(chalk.bold.yellow('Unstaged changes:'));
    status.unstaged.forEach((file) => {
      logger.log(`  ${chalk.yellow('M')} ${file}`);
    });
    logger.log('');
  }

  if (status.untracked.length > 0) {
    logger.log(chalk.bold.gray('Untracked files:'));
    status.untracked.forEach((file) => {
      logger.log(`  ${chalk.gray('?')} ${file}`);
    });
    logger.log('');
  }

  if (
    status.staged.length === 0 &&
    status.unstaged.length === 0 &&
    status.untracked.length === 0
  ) {
    logger.log(chalk.gray('Working tree clean'));
  }
}

async function showDiff(gitTools: GitTools, staged: boolean): Promise<void> {
  const diffs = gitTools.getDiff(staged);

  if (diffs.length === 0) {
    logger.log(chalk.gray('No changes to show'));
    return;
  }

  logger.log(chalk.bold(`${staged ? 'Staged' : 'Unstaged'} Changes:`));
  logger.log('');

  diffs.forEach((diff) => {
    logger.log(chalk.bold(diff.file));
    logger.log(
      `  ${chalk.green(`+${diff.additions}`)} ${chalk.red(`-${diff.deletions}`)}`
    );
    logger.log('');

    // Show diff preview (first 10 lines)
    const lines = diff.diff.split('\n').slice(0, 10);
    lines.forEach((line) => {
      if (line.startsWith('+')) {
        logger.log(chalk.green(line));
      } else if (line.startsWith('-')) {
        logger.log(chalk.red(line));
      } else {
        logger.log(chalk.gray(line));
      }
    });

    if (diff.diff.split('\n').length > 10) {
      logger.log(chalk.gray('... (truncated)'));
    }

    logger.log('');
  });
}

async function suggestCommit(gitTools: GitTools): Promise<void> {
  const suggestion = gitTools.suggestCommitMessage();

  if (!suggestion || suggestion === 'No staged changes') {
    logger.warn('No staged changes to commit');
    logger.log('');
    logger.log('Stage files first with:', chalk.cyan('git add <files>'));
    return;
  }

  logger.log(chalk.bold('Suggested Commit Message:'));
  logger.log('');
  logger.log(chalk.cyan(suggestion));
  logger.log('');

  // Show recent commits for reference
  const recentCommits = gitTools.getRecentCommits(5);

  if (recentCommits.length > 0) {
    logger.log(chalk.bold('Recent commits:'));
    recentCommits.forEach((commit, idx) => {
      logger.log(`  ${chalk.gray(`${idx + 1}.`)} ${commit}`);
    });
    logger.log('');
  }

  logger.log(chalk.gray('To commit, run:'));
  logger.log(chalk.cyan(`  git commit -m "${suggestion}"`));
}
