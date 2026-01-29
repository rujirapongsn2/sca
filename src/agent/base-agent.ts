/**
 * Base Agent - Simple agent runtime without external dependencies
 */

import type { LLMProvider } from '../llm/types.js';
import type { AgentTool, AgentContext, AgentMessage, AgentResponse, AgentConfig } from './types.js';
import { logger } from '../utils/logger.js';

export class BaseAgent {
  private tools: Map<string, AgentTool> = new Map();
  private conversationHistory: AgentMessage[] = [];
  private maxIterations: number;
  private systemPrompt: string;

  constructor(
    private llmProvider: LLMProvider,
    private context: AgentContext,
    config: AgentConfig = {}
  ) {
    this.maxIterations = config.maxIterations ?? 10;
    this.systemPrompt =
      config.systemPrompt ||
      `You are a helpful AI code assistant. You help developers analyze and work with their code.
You have access to tools to read files, scan the repository, and search for code.
Always think step by step and explain your reasoning.`;
  }

  /**
   * Register a tool
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.metadata.name, tool);
    logger.debug(`Registered tool: ${tool.metadata.name}`);
  }

  /**
   * Get available tools as string (for prompt)
   */
  private getToolsDescription(): string {
    const tools = Array.from(this.tools.values());
    if (tools.length === 0) {
      return 'No tools available.';
    }

    return tools
      .map((tool) => {
        const { name, description, risk_level } = tool.metadata;
        return `- ${name}: ${description} (risk: ${risk_level})`;
      })
      .join('\n');
  }

  /**
   * Run agent with a user message
   */
  async run(userMessage: string): Promise<AgentResponse> {
    logger.debug('Agent starting...');

    // Add system message if this is the first message
    if (this.conversationHistory.length === 0) {
      const toolsDesc = this.getToolsDescription();
      const systemMessage: AgentMessage = {
        role: 'system',
        content: `${this.systemPrompt}

Available tools:
${toolsDesc}

Workspace: ${this.context.workspace}`,
      };
      this.conversationHistory.push(systemMessage);
    }

    // Add user message
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    // Agent loop: analyze → plan → execute
    let iterations = 0;
    let response: AgentResponse | null = null;

    while (iterations < this.maxIterations) {
      iterations++;
      logger.debug(`Agent iteration ${iterations}/${this.maxIterations}`);

      // Get LLM response
      const llmResponse = await this.llmProvider.complete({
        messages: this.conversationHistory.map((msg) => ({
          role: msg.role === 'tool' ? 'assistant' : msg.role,
          content: msg.content,
        })),
        temperature: 0.2,
        max_tokens: 2048,
      });

      const assistantMessage: AgentMessage = {
        role: 'assistant',
        content: llmResponse.content,
      };

      this.conversationHistory.push(assistantMessage);

      // Check if agent is done (for now, simple text-based agent without tool calling)
      // In a real implementation, we'd parse tool calls from the response
      response = {
        content: llmResponse.content,
        finished: true, // For now, finish after one response
      };

      break; // Exit loop for now
    }

    if (!response) {
      throw new Error('Agent failed to produce a response');
    }

    logger.debug('Agent finished');
    return response;
  }

  /**
   * Get conversation history
   */
  getHistory(): AgentMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    logger.debug('Conversation history cleared');
  }

  /**
   * Get a summary of the conversation
   */
  getSummary(): string {
    const userMessages = this.conversationHistory.filter((msg) => msg.role === 'user');
    const assistantMessages = this.conversationHistory.filter((msg) => msg.role === 'assistant');

    return `Conversation: ${userMessages.length} user messages, ${assistantMessages.length} assistant responses`;
  }
}
