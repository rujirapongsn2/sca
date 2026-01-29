/**
 * LLM Provider Types
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionRequest {
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
  stream?: boolean;
}

export interface LLMCompletionResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  modelInfo?: {
    name?: string;
    size?: string;
    version?: string;
  };
}

export interface LLMProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Test connection to LLM
   */
  testConnection(): Promise<TestConnectionResult>;

  /**
   * Generate completion
   */
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;

  /**
   * Generate streaming completion
   */
  streamComplete?(
    request: LLMCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<LLMCompletionResponse>;
}

export interface LLMProviderConfig {
  provider: 'local' | 'external';
  endpoint: string;
  model_name?: string;
  api_key?: string;
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
}
