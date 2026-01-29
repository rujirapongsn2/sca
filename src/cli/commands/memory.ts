/**
 * Memory command - Manage memory store
 */

import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { getConfigManager } from '../../core/config.js';
import { MemoryStore } from '../../memory/memory-store.js';
import { join } from 'path';

export async function memoryCommand(
  action: 'show' | 'forget' | 'export' | 'stats',
  options: { type?: string; category?: string; key?: string } = {}
): Promise<void> {
  try {
    // Load config
    const configManager = getConfigManager();
    const memoryConfig = configManager.getMemoryConfig();

    if (memoryConfig.mode === 'off') {
      logger.warn('Memory is disabled in config');
      logger.log('');
      logger.log('To enable, edit .sca/config.yml and set:');
      logger.log(`  ${chalk.cyan('memory.mode')}: project`);
      process.exit(1);
    }

    // Open memory store
    const dbPath = join(process.cwd(), memoryConfig.storage_path);
    const memoryStore = new MemoryStore(dbPath);

    try {
      switch (action) {
        case 'show':
          await showMemory(memoryStore, options);
          break;

        case 'forget':
          await forgetMemory(memoryStore, options);
          break;

        case 'export':
          await exportMemory(memoryStore);
          break;

        case 'stats':
          await showStats(memoryStore);
          break;

        default:
          logger.error(`Unknown action: ${action}`);
          process.exit(1);
      }
    } finally {
      memoryStore.close();
    }
  } catch (error) {
    logger.error('Memory command failed:');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}

async function showMemory(
  store: MemoryStore,
  options: { type?: string; category?: string; key?: string }
): Promise<void> {
  logger.info('Memory contents:');
  logger.log('');

  const query: any = {};
  if (options.type) query.type = options.type;
  if (options.category) query.category = options.category;
  if (options.key) query.key = options.key;

  const entries = store.query(query);

  if (entries.length === 0) {
    logger.log(chalk.gray('No memory entries found'));
    return;
  }

  entries.forEach((entry) => {
    logger.log(chalk.bold(`${entry.type}/${entry.category}/${entry.key}`));
    logger.log(`  Value: ${chalk.cyan(entry.value)}`);
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      logger.log(`  Metadata: ${chalk.gray(JSON.stringify(entry.metadata))}`);
    }
    logger.log(`  Updated: ${chalk.gray(entry.updated_at)}`);
    logger.log('');
  });

  logger.log(chalk.gray(`Total: ${entries.length} entries`));
}

async function forgetMemory(
  store: MemoryStore,
  options: { type?: string; category?: string; key?: string }
): Promise<void> {
  const query: any = {};
  if (options.type) query.type = options.type;
  if (options.category) query.category = options.category;
  if (options.key) query.key = options.key;

  if (!options.type && !options.category && !options.key) {
    logger.error('Please specify what to forget (--type, --category, or --key)');
    process.exit(1);
  }

  const count = store.delete(query);

  if (count > 0) {
    logger.success(`Forgot ${count} memory entries`);
  } else {
    logger.log(chalk.gray('No matching entries found'));
  }
}

async function exportMemory(store: MemoryStore): Promise<void> {
  const entries = store.query({});

  const exported = {
    exported_at: new Date().toISOString(),
    total: entries.length,
    entries: entries.map((e) => ({
      type: e.type,
      category: e.category,
      key: e.key,
      value: e.value,
      metadata: e.metadata,
      created_at: e.created_at,
      updated_at: e.updated_at,
    })),
  };

  logger.log(JSON.stringify(exported, null, 2));
}

async function showStats(store: MemoryStore): Promise<void> {
  const stats = store.getStats();

  logger.log(chalk.bold('Memory Statistics:'));
  logger.log('');
  logger.log(`  Total entries: ${chalk.cyan(stats.total.toString())}`);
  logger.log(`  Project: ${chalk.cyan(stats.project.toString())}`);
  logger.log(`  User: ${chalk.cyan(stats.user.toString())}`);
  logger.log('');

  if (Object.keys(stats.categories).length > 0) {
    logger.log(chalk.bold('By Category:'));
    Object.entries(stats.categories).forEach(([category, count]) => {
      logger.log(`  ${category}: ${chalk.cyan(count.toString())}`);
    });
  }
}
