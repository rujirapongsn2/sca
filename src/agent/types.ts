/**
 * Agent Types
 */

import type { ToolMetadata } from '../types/index.js';

export interface AgentTool {
  metadata: ToolMetadata;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentContext {
  workspace: string;
  config: Record<string, unknown>;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentResponse {
  content: string;
  tool_calls?: ToolCall[];
  finished: boolean;
}

export interface AgentConfig {
  maxIterations?: number;
  temperature?: number;
  systemPrompt?: string;
}
