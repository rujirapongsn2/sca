/**
 * Scan command - Analyze repository structure
 */

import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { FileTools } from '../../tools/file-tools.js';

export async function scanCommand(options: { verbose?: boolean; depth?: number } = {}): Promise<void> {
  const cwd = process.cwd();
  const fileTools = new FileTools(cwd);

  logger.info('Scanning repository...');
  logger.log('');

  try {
    // Detect tech stack
    logger.log(chalk.bold('🔍 Tech Stack:'));
    const techStack = fileTools.detectTechStack();
    if (techStack.length > 0) {
      techStack.forEach((tech) => {
        logger.log(`  • ${chalk.cyan(tech)}`);
      });
    } else {
      logger.log(`  ${chalk.gray('No known tech stack detected')}`);
    }
    logger.log('');

    // Show file tree
    logger.log(chalk.bold('📂 Repository Structure:'));
    const tree = fileTools.getFileTree('.', {
      maxDepth: options.depth ?? 3,
      excludePatterns: ['node_modules', '.git', 'dist', 'build', 'coverage', '.next'],
      includeDotFiles: false,
    });
    logger.log(tree);
    logger.log('');

    // Show statistics
    logger.log(chalk.bold('📊 Statistics:'));
    const allFiles = fileTools.listFiles('.', true);
    const files = allFiles.filter((f) => f.type === 'file');
    const dirs = allFiles.filter((f) => f.type === 'directory');
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    logger.log(`  Files: ${chalk.cyan(files.length.toString())}`);
    logger.log(`  Directories: ${chalk.cyan(dirs.length.toString())}`);
    logger.log(`  Total size: ${chalk.cyan(formatBytes(totalSize))}`);
    logger.log('');

    // Entry points (common patterns)
    logger.log(chalk.bold('🚀 Entry Points:'));
    const entryPoints = findEntryPoints(fileTools);
    if (entryPoints.length > 0) {
      entryPoints.forEach((entry) => {
        logger.log(`  • ${chalk.cyan(entry)}`);
      });
    } else {
      logger.log(`  ${chalk.gray('No common entry points found')}`);
    }
    logger.log('');

    logger.success('Repository scan complete!');
  } catch (error) {
    logger.error('Failed to scan repository:');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
}

/**
 * Find common entry points
 */
function findEntryPoints(fileTools: FileTools): string[] {
  const entryPoints: string[] = [];
  const commonEntries = [
    'src/main.ts',
    'src/main.js',
    'src/index.ts',
    'src/index.js',
    'main.py',
    'app.py',
    '__main__.py',
    'main.go',
    'cmd/main.go',
    'src/main.rs',
    'index.html',
    'public/index.html',
  ];

  for (const entry of commonEntries) {
    try {
      fileTools.readFile(entry, { maxSize: 100 }); // Just check if exists
      entryPoints.push(entry);
    } catch {
      // File doesn't exist, skip
    }
  }

  return entryPoints;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
