/**
 * Local LLM Provider (Ollama/vLLM/OpenAI-compatible)
 */

import type {
  LLMProvider,
  LLMProviderConfig,
  LLMCompletionRequest,
  LLMCompletionResponse,
  TestConnectionResult,
} from './types.js';
import { logger } from '../utils/logger.js';

export class LocalLLMProvider implements LLMProvider {
  readonly name = 'LocalLLM';
  private endpoint: string;
  private modelName: string;
  private apiKey?: string;
  private timeout: number;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: LLMProviderConfig) {
    this.endpoint = config.endpoint;
    this.modelName = config.model_name || 'codellama';
    this.apiKey = config.api_key;
    this.timeout = config.timeout || 60000; // 60 seconds default
    this.defaultTemperature = config.temperature ?? 0.2;
    this.defaultMaxTokens = config.max_tokens ?? 4096;

    logger.debug(`LocalLLM initialized: ${this.endpoint}, model: ${this.modelName}`);
  }

  /**
   * Test connection to local LLM
   */
  async testConnection(): Promise<TestConnectionResult> {
    try {
      logger.debug('Testing connection to local LLM...');

      // Try Ollama API format first (no auth needed)
      try {
        const response = await this.fetchWithTimeout(`${this.endpoint}/api/tags`, {
          method: 'GET',
        });

        if (response.ok) {
          logger.debug('Connection successful (Ollama API)');
          const data = await response.json();
          const models = data.models || [];
          const currentModel = models.find((m: any) => m.name.includes(this.modelName));

          return {
            success: true,
            modelInfo: currentModel ? {
              name: currentModel.name,
              size: currentModel.size ? `${Math.round(currentModel.size / 1024 / 1024 / 1024 * 10) / 10}GB` : undefined,
            } : undefined,
          };
        }
      } catch (ollamaError) {
        logger.debug('Ollama API test failed, trying OpenAI-compatible format');
      }

      // Try OpenAI-compatible format (with auth if available)
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const modelsResponse = await this.fetchWithTimeout(`${this.endpoint}/models`, {
        method: 'GET',
        headers,
      });

      if (modelsResponse.ok) {
        logger.debug('Connection successful (OpenAI-compatible API)');
        const data = await modelsResponse.json();
        const models = data.data || [];
        const currentModel = models.find((m: any) => m.id === this.modelName || m.id.includes(this.modelName));

        return {
          success: true,
          modelInfo: currentModel ? {
            name: currentModel.id || this.modelName,
          } : { name: this.modelName },
        };
      }

      const errorText = await modelsResponse.text();
      let errorMessage = `HTTP ${modelsResponse.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      logger.warn('Could not connect to LLM endpoint:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Connection test failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate completion
   */
  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.max_tokens ?? this.defaultMaxTokens;

    // Try Ollama format first
    try {
      return await this.ollamaComplete(request, temperature, maxTokens);
    } catch (ollamaError) {
      logger.debug('Ollama format failed, trying OpenAI-compatible format');

      // Fallback to OpenAI-compatible format
      try {
        return await this.openaiComplete(request, temperature, maxTokens);
      } catch (openaiError) {
        logger.error('Both API formats failed');
        throw new Error(
          `Failed to generate completion: ${ollamaError instanceof Error ? ollamaError.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Ollama API format completion
   */
  private async ollamaComplete(
    request: LLMCompletionRequest,
    temperature: number,
    maxTokens: number
  ): Promise<LLMCompletionResponse> {
    // Convert messages to Ollama format (concatenate into single prompt)
    const prompt = this.messagesToPrompt(request.messages);

    const response = await this.fetchWithTimeout(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelName,
        prompt,
        temperature,
        stream: false,
        options: {
          num_predict: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      content: data.response || '',
      model: data.model,
      finish_reason: data.done ? 'stop' : undefined,
    };
  }

  /**
   * OpenAI-compatible API format completion
   */
  private async openaiComplete(
    request: LLMCompletionRequest,
    temperature: number,
    maxTokens: number
  ): Promise<LLMCompletionResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await this.fetchWithTimeout(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.modelName,
        messages: request.messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No completion returned from API');
    }

    return {
      content: choice.message?.content || '',
      model: data.model,
      usage: data.usage,
      finish_reason: choice.finish_reason,
    };
  }

  /**
   * Convert messages to single prompt (for Ollama)
   */
  private messagesToPrompt(messages: LLMCompletionRequest['messages']): string {
    return messages
      .map((msg) => {
        if (msg.role === 'system') {
          return `System: ${msg.content}`;
        } else if (msg.role === 'user') {
          return `User: ${msg.content}`;
        } else {
          return `Assistant: ${msg.content}`;
        }
      })
      .join('\n\n');
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
