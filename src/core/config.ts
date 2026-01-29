/**
 * Configuration management
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import type { Config } from '../types/index.js';
import { logger } from '../utils/logger.js';

const DEFAULT_CONFIG: Config = {
  version: '0.1.0',
  workspace_root: '.',
  model: {
    provider: 'local',
    endpoint: 'http://localhost:11434',
    model_name: 'codellama',
    temperature: 0.2,
    max_tokens: 4096,
  },
  policies: {
    exec_allowlist: [
      'pytest*',
      'npm test',
      'npm run test',
      'go test*',
      'cargo test',
      'make test',
      'jest*',
      'vitest*',
    ],
    path_allowlist: ['.'],
    path_denylist: ['.env*', 'secrets/**', '*.pem', '*.key', 'credentials*'],
    require_confirmation: true,
  },
  commands: {
    presets: {
      test: {
        description: 'Run project tests',
        command: 'npm test',
      },
      lint: {
        description: 'Run linter',
        command: 'npm run lint',
      },
      build: {
        description: 'Build project',
        command: 'npm run build',
      },
    },
  },
  memory: {
    mode: 'project',
    storage_path: '.sca/memory.db',
  },
  privacy: {
    strict_mode: true,
    redact_secrets: true,
    audit_log: true,
  },
};

export class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.configPath = join(workspaceRoot, '.sca', 'config.yml');
    this.config = this.loadConfig();
  }

  /**
   * Load config from file, or return default
   */
  private loadConfig(): Config {
    if (!existsSync(this.configPath)) {
      logger.warn(`Config file not found: ${this.configPath}`);
      logger.info('Using default configuration. Run "sca init" to create config file.');
      return DEFAULT_CONFIG;
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      const parsed = YAML.parse(content) as Config;

      // Merge with defaults to handle missing fields
      return this.mergeWithDefaults(parsed);
    } catch (error) {
      logger.error(`Failed to load config from ${this.configPath}:`);
      if (error instanceof Error) {
        logger.error(error.message);
      }
      logger.warn('Using default configuration');
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Merge loaded config with defaults
   */
  private mergeWithDefaults(loaded: Partial<Config>): Config {
    return {
      version: loaded.version ?? DEFAULT_CONFIG.version,
      workspace_root: loaded.workspace_root ?? DEFAULT_CONFIG.workspace_root,
      model: { ...DEFAULT_CONFIG.model, ...loaded.model },
      policies: { ...DEFAULT_CONFIG.policies, ...loaded.policies },
      commands: { ...DEFAULT_CONFIG.commands, ...loaded.commands },
      memory: { ...DEFAULT_CONFIG.memory, ...loaded.memory },
      privacy: { ...DEFAULT_CONFIG.privacy, ...loaded.privacy },
    };
  }

  /**
   * Get current config
   */
  getConfig(): Readonly<Config> {
    return this.config;
  }

  /**
   * Get model config
   */
  getModelConfig() {
    return this.config.model;
  }

  /**
   * Get policy config
   */
  getPolicyConfig() {
    return this.config.policies;
  }

  /**
   * Get command presets
   */
  getCommandPresets() {
    return this.config.commands.presets;
  }

  /**
   * Get memory config
   */
  getMemoryConfig() {
    return this.config.memory;
  }

  /**
   * Get privacy config
   */
  getPrivacyConfig() {
    return this.config.privacy;
  }

  /**
   * Check if strict mode is enabled
   */
  isStrictMode(): boolean {
    return this.config.privacy.strict_mode;
  }

  /**
   * Reload config from file
   */
  reload(): void {
    this.config = this.loadConfig();
    logger.debug('Configuration reloaded');
  }
}

/**
 * Global config instance (lazy loaded)
 */
let globalConfig: ConfigManager | null = null;

export function getConfigManager(workspaceRoot?: string): ConfigManager {
  if (!globalConfig) {
    globalConfig = new ConfigManager(workspaceRoot);
  }
  return globalConfig;
}

export function resetConfigManager(): void {
  globalConfig = null;
}
