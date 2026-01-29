/**
 * Ask command - Ask agent a question
 */

import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../../utils/logger.js';
import { getConfigManager } from '../../core/config.js';
import { LLMProviderFactory } from '../../llm/provider-factory.js';
import { BaseAgent } from '../../agent/base-agent.js';

export async function askCommand(question: string): Promise<void> {
  if (!question || question.trim().length === 0) {
    logger.error('Please provide a question');
    logger.log('');
    logger.log('Usage:');
    logger.log(`  ${chalk.cyan('sca ask "What files are in this project?"')}`);
    logger.log(`  ${chalk.cyan('sca ask "Explain what this code does"')}`);
    process.exit(1);
  }

  logger.info('Asking agent...');
  logger.log('');

  try {
    // Load config
    const configManager = getConfigManager();
    const modelConfig = configManager.getModelConfig();

    // Create LLM provider
    const provider = LLMProviderFactory.fromModelConfig(modelConfig);

    // Test connection first
    const spinner = ora('Connecting to LLM...').start();
    const connected = await provider.testConnection();

    if (!connected) {
      spinner.fail('Connection failed');
      logger.log('');
      logger.error('Could not connect to LLM. Run "sca test-llm" to diagnose.');
      process.exit(1);
    }

    spinner.succeed('Connected to LLM');

    // Create agent
    const agent = new BaseAgent(
      provider,
      {
        workspace: process.cwd(),
        config: {},
      },
      {
        systemPrompt: `You are a helpful AI code assistant working in a local development environment.
You help developers understand their code and answer questions about their projects.
Be concise and helpful.`,
      }
    );

    // Get response
    spinner.text = 'Thinking...';
    spinner.start();

    const response = await agent.run(question);

    spinner.succeed('Got response');
    logger.log('');

    // Display question
    logger.log(chalk.bold('Question:'));
    logger.log(chalk.cyan(question));
    logger.log('');

    // Display response
    logger.log(chalk.bold('Answer:'));
    logger.log(chalk.gray('─'.repeat(60)));
    logger.log(response.content.trim());
    logger.log(chalk.gray('─'.repeat(60)));
    logger.log('');

    logger.success('✨ Done!');
  } catch (error) {
    logger.error('Ask command failed:');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}
