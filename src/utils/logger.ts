/**
 * Simple logger utility
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

class Logger {
  private verbosity: number = 1; // 0=quiet, 1=normal, 2=verbose

  setVerbosity(level: number): void {
    this.verbosity = level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.verbosity >= 2) {
      console.log(chalk.gray('[DEBUG]'), message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.verbosity >= 1) {
      console.log(chalk.blue('[INFO]'), message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.verbosity >= 1) {
      console.log(chalk.yellow('[WARN]'), message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    console.error(chalk.red('[ERROR]'), message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    if (this.verbosity >= 1) {
      console.log(chalk.green('[✓]'), message, ...args);
    }
  }

  log(message: string, ...args: unknown[]): void {
    console.log(message, ...args);
  }
}

export const logger = new Logger();
