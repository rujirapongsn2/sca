/**
 * Tests for LLM Provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalLLMProvider } from '../src/llm/local-provider.js';
import { LLMProviderFactory } from '../src/llm/provider-factory.js';
import type { LLMProviderConfig } from '../src/llm/types.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('LLMProvider', () => {
  let config: LLMProviderConfig;

  beforeEach(() => {
    config = {
      provider: 'local',
      endpoint: 'http://localhost:11434',
      model_name: 'codellama',
      temperature: 0.2,
      max_tokens: 4096,
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('LocalLLMProvider', () => {
    it('should create provider with config', () => {
      const provider = new LocalLLMProvider(config);
      expect(provider.name).toBe('LocalLLM');
    });

    it('should test connection successfully (Ollama)', async () => {
      const provider = new LocalLLMProvider(config);

      // Mock successful Ollama response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const result = await provider.testConnection();
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.any(Object)
      );
    });

    it('should test connection successfully (OpenAI)', async () => {
      const provider = new LocalLLMProvider(config);

      // Mock failed Ollama, successful OpenAI
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Ollama failed')) // Ollama throws
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [{ id: 'codellama' }] }),
        }); // OpenAI succeeds

      const result = await provider.testConnection();
      expect(result.success).toBe(true);
      expect(result.modelInfo?.name).toBe('codellama');
    });

    it('should fail connection test when both APIs fail', async () => {
      const provider = new LocalLLMProvider(config);

      // Mock both failing
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Ollama failed'))
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        });

      const result = await provider.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should complete with Ollama format', async () => {
      const provider = new LocalLLMProvider(config);

      // Mock Ollama completion response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Hello from LLM!',
          model: 'codellama',
          done: true,
        }),
      });

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Say hello' }],
      });

      expect(response.content).toBe('Hello from LLM!');
      expect(response.model).toBe('codellama');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should complete with OpenAI format when Ollama fails', async () => {
      const provider = new LocalLLMProvider(config);

      // Mock Ollama fail, OpenAI success
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, text: async () => 'Ollama error' }) // Ollama fails
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: { content: 'Hello from OpenAI!' },
                finish_reason: 'stop',
              },
            ],
            model: 'gpt-3.5-turbo',
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
        }); // OpenAI succeeds

      const response = await provider.complete({
        messages: [{ role: 'user', content: 'Say hello' }],
      });

      expect(response.content).toBe('Hello from OpenAI!');
      expect(response.usage).toBeDefined();
      expect(response.usage?.total_tokens).toBe(15);
    });

    it('should throw error when both formats fail', async () => {
      const provider = new LocalLLMProvider(config);

      // Mock both failing
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, text: async () => 'Ollama error' })
        .mockResolvedValueOnce({ ok: false, text: async () => 'OpenAI error' });

      await expect(
        provider.complete({
          messages: [{ role: 'user', content: 'Say hello' }],
        })
      ).rejects.toThrow('Failed to generate completion');
    });
  });

  describe('LLMProviderFactory', () => {
    it('should create local provider', () => {
      const provider = LLMProviderFactory.create(config);
      expect(provider).toBeInstanceOf(LocalLLMProvider);
      expect(provider.name).toBe('LocalLLM');
    });

    it('should create provider from model config', () => {
      const provider = LLMProviderFactory.fromModelConfig({
        provider: 'local',
        endpoint: 'http://localhost:11434',
        model_name: 'codellama',
      });
      expect(provider).toBeInstanceOf(LocalLLMProvider);
    });

    it('should handle external provider', () => {
      const provider = LLMProviderFactory.create({
        ...config,
        provider: 'external',
      });
      // For now, external uses same implementation
      expect(provider).toBeInstanceOf(LocalLLMProvider);
    });
  });
});
