/**
 * Test LLM command - Test connection to LLM provider
 */

import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../../utils/logger.js';
import { getConfigManager } from '../../core/config.js';
import { LLMProviderFactory } from '../../llm/provider-factory.js';

export async function testLlmCommand(): Promise<void> {
  logger.info('Testing LLM connection...');
  logger.log('');

  try {
    // Load config
    const configManager = getConfigManager();
    const modelConfig = configManager.getModelConfig();

    logger.log(chalk.bold('Configuration:'));
    logger.log(`  Provider: ${chalk.cyan(modelConfig.provider)}`);
    logger.log(`  Endpoint: ${chalk.cyan(modelConfig.endpoint)}`);
    logger.log(`  Model: ${chalk.cyan(modelConfig.model_name || 'default')}`);
    logger.log('');

    // Create provider
    const spinner = ora('Connecting to LLM...').start();
    const provider = LLMProviderFactory.fromModelConfig(modelConfig);

    // Test connection
    const result = await provider.testConnection();

    if (!result.success) {
      spinner.fail('Connection failed');
      logger.log('');
      logger.error('Could not connect to LLM endpoint.');
      if (result.error) {
        logger.error(`Error: ${result.error}`);
      }
      logger.log('');
      logger.log('Troubleshooting:');
      logger.log(`  1. Check if LLM server is running at ${chalk.cyan(modelConfig.endpoint)}`);
      logger.log('  2. For Ollama, try: ollama serve');
      logger.log('  3. For OpenAI/Claude, verify your API key');
      logger.log('  4. Verify endpoint in .sca/config.yml');
      process.exit(1);
    }

    spinner.succeed('Connection successful');

    // Show model info if available
    if (result.modelInfo) {
      if (result.modelInfo.name) {
        logger.log(`  Model: ${chalk.cyan(result.modelInfo.name)}`);
      }
      if (result.modelInfo.size) {
        logger.log(`  Size: ${chalk.cyan(result.modelInfo.size)}`);
      }
    }
    logger.log('');

    // Test completion
    spinner.text = 'Testing completion...';
    spinner.start();

    const response = await provider.complete({
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from SCA!" and nothing else.',
        },
      ],
      temperature: 0.1,
      max_tokens: 50,
    });

    spinner.succeed('Completion successful');
    logger.log('');

    // Show response
    logger.log(chalk.bold('Response:'));
    logger.log(chalk.gray('─'.repeat(50)));
    logger.log(response.content.trim());
    logger.log(chalk.gray('─'.repeat(50)));
    logger.log('');

    // Show usage stats
    if (response.usage) {
      logger.log(chalk.bold('Usage:'));
      logger.log(`  Prompt tokens: ${chalk.cyan(response.usage.prompt_tokens.toString())}`);
      logger.log(`  Completion tokens: ${chalk.cyan(response.usage.completion_tokens.toString())}`);
      logger.log(`  Total tokens: ${chalk.cyan(response.usage.total_tokens.toString())}`);
      logger.log('');
    }

    logger.success('✨ LLM is working correctly!');
  } catch (error) {
    logger.error('LLM test failed:');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}
