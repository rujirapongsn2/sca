#!/usr/bin/env node

/**
 * Softnix Code Agent CLI
 * Main entry point for the CLI tool
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getVersion } from './utils/version.js';
import { logger } from './utils/logger.js';
import { initCommand, scanCommand, testLlmCommand, askCommand, runCommand, memoryCommand, gitCommand } from './cli/commands/index.js';

const program = new Command();

program
  .name('sca')
  .description('Softnix Code Agent - AI-powered local-first code assistant')
  .version(getVersion(), '-v, --version', 'Display version number')
  .option('--verbose', 'Enable verbose logging')
  .option('--quiet', 'Suppress non-essential output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      logger.setVerbosity(2);
    } else if (opts.quiet) {
      logger.setVerbosity(0);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize SCA in the current workspace')
  .option('-f, --force', 'Force reinitialize (overwrite existing config)')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      logger.error('Init command failed');
      process.exit(1);
    }
  });

// Scan command
program
  .command('scan')
  .description('Scan and analyze repository structure')
  .option('-d, --depth <number>', 'Maximum directory depth', '3')
  .action(async (options) => {
    try {
      const depth = parseInt(options.depth, 10);
      await scanCommand({ ...options, depth });
    } catch (error) {
      logger.error('Scan command failed');
      process.exit(1);
    }
  });

// Test LLM command
program
  .command('test-llm')
  .description('Test connection to LLM provider')
  .action(async () => {
    try {
      await testLlmCommand();
    } catch (error) {
      logger.error('Test LLM command failed');
      process.exit(1);
    }
  });

// Ask command
program
  .command('ask <question>')
  .description('Ask the agent a question')
  .action(async (question) => {
    try {
      await askCommand(question);
    } catch (error) {
      logger.error('Ask command failed');
      process.exit(1);
    }
  });

// Run command
program
  .command('run <preset>')
  .description('Run a command preset (test, lint, build)')
  .option('-s, --stream', 'Stream output in real-time')
  .action(async (preset, options) => {
    try {
      await runCommand(preset, options);
    } catch (error) {
      logger.error('Run command failed');
      process.exit(1);
    }
  });

// Memory command
program
  .command('memory <action>')
  .description('Manage memory store (show, forget, export, stats)')
  .option('-t, --type <type>', 'Filter by type (project/user)')
  .option('-c, --category <category>', 'Filter by category')
  .option('-k, --key <key>', 'Filter by key')
  .action(async (action, options) => {
    try {
      await memoryCommand(action, options);
    } catch (error) {
      logger.error('Memory command failed');
      process.exit(1);
    }
  });

// Git command
program
  .command('git <action>')
  .description('Git operations (status, diff, suggest)')
  .option('-s, --staged', 'Show staged changes (for diff)')
  .action(async (action, options) => {
    try {
      await gitCommand(action, options);
    } catch (error) {
      logger.error('Git command failed');
      process.exit(1);
    }
  });

// Interactive mode (default action when no command specified)
program
  .action(() => {
    logger.log(chalk.bold.cyan('🤖 Softnix Code Agent'));
    logger.log(chalk.gray(`Version ${getVersion()}`));
    logger.log('');
    logger.info('Interactive mode is not yet implemented.');
    logger.log('');
    logger.log('Available commands:');
    logger.log(`  ${chalk.cyan('sca init')}             - Initialize SCA in current workspace`);
    logger.log(`  ${chalk.cyan('sca scan')}             - Scan and analyze repository`);
    logger.log(`  ${chalk.cyan('sca test-llm')}         - Test LLM connection`);
    logger.log(`  ${chalk.cyan('sca ask "<question>"')} - Ask the agent a question`);
    logger.log(`  ${chalk.cyan('sca run <preset>')}     - Run command preset (test/lint/build)`);
    logger.log(`  ${chalk.cyan('sca memory <action>')}  - Manage memory (show/forget/stats)`);
    logger.log(`  ${chalk.cyan('sca git <action>')}     - Git operations (status/diff/suggest)`);
    logger.log(`  ${chalk.cyan('sca --help')}           - Show help`);
    logger.log(`  ${chalk.cyan('sca --version')}        - Show version`);
    logger.log('');
    logger.info('Run', chalk.cyan('sca init'), 'to get started!');
  });

// Parse arguments
program.parse();
