/**
 * Core types for Softnix Code Agent
 */

export interface Config {
  version: string;
  workspace_root: string;
  model: ModelConfig;
  policies: PolicyConfig;
  commands: CommandsConfig;
  memory: MemoryConfig;
  privacy: PrivacyConfig;
}

export interface ModelConfig {
  provider: 'local' | 'external';
  endpoint: string;
  model_name?: string;
  api_key?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface PolicyConfig {
  exec_allowlist: string[];
  path_allowlist: string[];
  path_denylist: string[];
  require_confirmation: boolean;
}

export interface CommandsConfig {
  presets: Record<string, CommandPreset>;
}

export interface CommandPreset {
  description: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

export interface MemoryConfig {
  mode: 'off' | 'project' | 'project+user';
  storage_path: string;
}

export interface PrivacyConfig {
  strict_mode: boolean;
  redact_secrets: boolean;
  audit_log: boolean;
}

export type RiskLevel = 'read' | 'write' | 'exec' | 'network';

export interface ToolMetadata {
  name: string;
  description: string;
  risk_level: RiskLevel;
  scope?: string[];
  requires_confirmation: boolean;
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  tool?: string;
  status: 'success' | 'failure' | 'denied';
  user_confirmed?: boolean;
  metadata?: Record<string, unknown>;
}
