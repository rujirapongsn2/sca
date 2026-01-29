/**
 * Session Types
 */

export interface SessionData {
  id: string;
  name?: string;
  created_at: string;
  updated_at: string;
  workspace: string;
  conversation: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  context: Record<string, unknown>;
}

export interface SessionMetadata {
  id: string;
  name?: string;
  created_at: string;
  updated_at: string;
  workspace: string;
  message_count: number;
}
