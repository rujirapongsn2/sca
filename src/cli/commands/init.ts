/**
 * Init command - Setup SCA in current workspace
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger.js';
import chalk from 'chalk';

const DEFAULT_CONFIG = `# Softnix Code Agent Configuration
version: '0.1.0'
workspace_root: '.'

# Model configuration
model:
  provider: 'local'  # 'local' or 'external'
  endpoint: 'http://localhost:11434'  # Ollama default endpoint
  model_name: 'codellama'
  temperature: 0.2
  max_tokens: 4096

# Security policies
policies:
  exec_allowlist:
    - 'pytest*'
    - 'npm test'
    - 'npm run test'
    - 'go test*'
    - 'cargo test'
    - 'make test'
    - 'jest*'
    - 'vitest*'
  path_allowlist:
    - '.'
  path_denylist:
    - '.env*'
    - 'secrets/**'
    - '*.pem'
    - '*.key'
    - 'credentials*'
  require_confirmation: true

# Command presets
commands:
  presets:
    test:
      description: 'Run project tests'
      command: 'npm test'
    lint:
      description: 'Run linter'
      command: 'npm run lint'
    build:
      description: 'Build project'
      command: 'npm run build'

# Memory configuration
memory:
  mode: 'project'  # 'off' | 'project' | 'project+user'
  storage_path: '.sca/memory.db'

# Privacy settings
privacy:
  strict_mode: true
  redact_secrets: true
  audit_log: true
`;

export async function initCommand(options: { force?: boolean } = {}): Promise<void> {
  const cwd = process.cwd();
  const scaDir = join(cwd, '.sca');
  const configPath = join(scaDir, 'config.yml');

  logger.info('Initializing Softnix Code Agent...');

  // Check if already initialized
  if (existsSync(configPath) && !options.force) {
    logger.warn('SCA is already initialized in this directory.');
    logger.info(`Config file: ${chalk.cyan(configPath)}`);
    logger.info('Use --force to reinitialize.');
    return;
  }

  try {
    // Create .sca directory
    if (!existsSync(scaDir)) {
      mkdirSync(scaDir, { recursive: true });
      logger.debug(`Created directory: ${scaDir}`);
    }

    // Create config file
    writeFileSync(configPath, DEFAULT_CONFIG, 'utf-8');
    logger.success(`Created config file: ${chalk.cyan(configPath)}`);

    // Create memory directory
    const memoryDir = join(scaDir, 'memory');
    if (!existsSync(memoryDir)) {
      mkdirSync(memoryDir, { recursive: true });
      logger.debug(`Created memory directory: ${memoryDir}`);
    }

    // Create audit log directory
    const auditDir = join(scaDir, 'audit');
    if (!existsSync(auditDir)) {
      mkdirSync(auditDir, { recursive: true });
      logger.debug(`Created audit directory: ${auditDir}`);
    }

    // Create .gitkeep files
    writeFileSync(join(memoryDir, '.gitkeep'), '', 'utf-8');
    writeFileSync(join(auditDir, '.gitkeep'), '', 'utf-8');

    logger.success('✨ SCA initialized successfully!');
    logger.log('');
    logger.info('Next steps:');
    logger.log('  1. Review and edit', chalk.cyan('.sca/config.yml'));
    logger.log('  2. Run', chalk.cyan('sca'), 'to start interactive mode');
    logger.log('  3. Or use', chalk.cyan('sca --help'), 'to see available commands');
  } catch (error) {
    logger.error('Failed to initialize SCA:');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    throw error;
  }
}
