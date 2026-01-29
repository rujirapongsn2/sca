/**
 * LLM Provider Factory
 */

import type { LLMProvider, LLMProviderConfig } from './types.js';
import { LocalLLMProvider } from './local-provider.js';
import { logger } from '../utils/logger.js';

export class LLMProviderFactory {
  /**
   * Create LLM provider from config
   */
  static create(config: LLMProviderConfig): LLMProvider {
    logger.debug(`Creating LLM provider: ${config.provider}`);

    switch (config.provider) {
      case 'local':
        return new LocalLLMProvider(config);

      case 'external':
        // For now, treat external the same as local (OpenAI-compatible)
        // In the future, could add specific external providers (OpenAI, Anthropic, etc.)
        logger.warn('External provider uses same implementation as local (OpenAI-compatible)');
        return new LocalLLMProvider(config);

      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * Create provider from model config
   */
  static fromModelConfig(modelConfig: {
    provider: 'local' | 'external';
    endpoint: string;
    model_name?: string;
    api_key?: string;
    temperature?: number;
    max_tokens?: number;
  }): LLMProvider {
    return LLMProviderFactory.create({
      provider: modelConfig.provider,
      endpoint: modelConfig.endpoint,
      model_name: modelConfig.model_name,
      api_key: modelConfig.api_key,
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.max_tokens,
    });
  }
}
