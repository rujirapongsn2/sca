/**
 * Connect command - Interactive LLM provider connection setup
 */

import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { ConfigManager } from '../../core/config.js';
import { LocalLLMProvider } from '../../llm/local-provider.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

interface ProviderConfig {
  name: string;
  endpoint: string;
  apiKey?: string;
  model: string;
}

const PROVIDER_PRESETS = [
  {
    name: 'Ollama (Local)',
    value: 'ollama',
    endpoint: 'http://localhost:11434',
    defaultModel: 'llama2',
    requiresApiKey: false,
  },
  {
    name: 'LM Studio (Local)',
    value: 'lmstudio',
    endpoint: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    requiresApiKey: false,
  },
  {
    name: 'vLLM (Local)',
    value: 'vllm',
    endpoint: 'http://localhost:8000/v1',
    defaultModel: 'model',
    requiresApiKey: false,
  },
  {
    name: 'OpenAI',
    value: 'openai',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4',
    requiresApiKey: true,
  },
  {
    name: 'Anthropic (Claude)',
    value: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-sonnet-20240229',
    requiresApiKey: true,
  },
  {
    name: 'Together AI',
    value: 'together',
    endpoint: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-2-70b-chat-hf',
    requiresApiKey: true,
  },
  {
    name: 'Custom (OpenAI-compatible)',
    value: 'custom',
    endpoint: '',
    defaultModel: '',
    requiresApiKey: false,
  },
];

async function testConnection(config: ProviderConfig): Promise<boolean> {
  try {
    console.log(chalk.blue('\n🔌 Testing connection...'));

    const provider = new LocalLLMProvider({
      provider: config.apiKey ? 'external' : 'local',
      endpoint: config.endpoint,
      model_name: config.model,
      api_key: config.apiKey,
    });

    const result = await provider.testConnection();

    if (result.success) {
      console.log(chalk.green('✓ Connection successful!'));
      if (result.modelInfo) {
        console.log(chalk.gray(`  Model: ${result.modelInfo.name || config.model}`));
        if (result.modelInfo.size) {
          console.log(chalk.gray(`  Size: ${result.modelInfo.size}`));
        }
      }
      return true;
    } else {
      console.log(chalk.red('✗ Connection failed:'), result.error);
      return false;
    }
  } catch (error) {
    console.log(chalk.red('✗ Connection error:'), error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function saveConfig(config: ProviderConfig): Promise<void> {
  const configPath = join(process.cwd(), '.sca', 'config.yml');

  if (!existsSync(configPath)) {
    console.log(chalk.yellow('⚠ Config file not found. Run `sca init` first.'));
    return;
  }

  // Read existing config
  const content = readFileSync(configPath, 'utf-8');
  const configData = YAML.parse(content);

  // Update model configuration
  configData.model = {
    type: config.apiKey ? 'external' : 'local',
    endpoint: config.endpoint,
    model_name: config.model,
    api_key: config.apiKey || null,
    temperature: configData.model?.temperature || 0.7,
    max_tokens: configData.model?.max_tokens || 2048,
  };

  // Write back
  writeFileSync(configPath, YAML.stringify(configData), 'utf-8');

  console.log(chalk.green('✓ Configuration saved!'));
  console.log(chalk.gray(`  Config file: ${configPath}`));
}

export const connectCommand = new Command('connect')
  .description('Connect to an LLM provider (OpenAI API compatible)')
  .action(async () => {
    try {
      console.log(chalk.bold('\n🔗 LLM Provider Connection Setup\n'));

      // Step 1: Select provider preset
      const providerChoice = await select({
        message: 'Select your LLM provider:',
        choices: PROVIDER_PRESETS.map((preset) => ({
          name: preset.name,
          value: preset.value,
          description: `${preset.endpoint || 'Custom endpoint'}`,
        })),
      });

      const preset = PROVIDER_PRESETS.find((p) => p.value === providerChoice);
      if (!preset) {
        console.log(chalk.red('Invalid provider selection'));
        return;
      }

      let endpoint = preset.endpoint;
      let model = preset.defaultModel;
      let apiKey: string | undefined;

      // Step 2: Custom configuration
      if (preset.value === 'custom') {
        endpoint = await input({
          message: 'Enter API endpoint URL:',
          default: 'http://localhost:8000/v1',
          validate: (value) => {
            if (!value.trim()) return 'Endpoint is required';
            try {
              new URL(value);
              return true;
            } catch {
              return 'Please enter a valid URL';
            }
          },
        });

        model = await input({
          message: 'Enter model name:',
          default: 'model',
          validate: (value) => (value.trim() ? true : 'Model name is required'),
        });

        const needsKey = await confirm({
          message: 'Does this endpoint require an API key?',
          default: false,
        });

        if (needsKey) {
          apiKey = await input({
            message: 'Enter API key:',
            validate: (value) => (value.trim() ? true : 'API key is required'),
          });
        }
      } else {
        // Confirm or customize preset settings
        const customizeEndpoint = await confirm({
          message: `Use default endpoint: ${endpoint}?`,
          default: true,
        });

        if (!customizeEndpoint) {
          endpoint = await input({
            message: 'Enter custom endpoint URL:',
            default: endpoint,
            validate: (value) => {
              if (!value.trim()) return 'Endpoint is required';
              try {
                new URL(value);
                return true;
              } catch {
                return 'Please enter a valid URL';
              }
            },
          });
        }

        // Model selection
        model = await input({
          message: 'Enter model name:',
          default: preset.defaultModel,
          validate: (value) => (value.trim() ? true : 'Model name is required'),
        });

        // API key if required
        if (preset.requiresApiKey) {
          apiKey = await input({
            message: `Enter ${preset.name} API key:`,
            validate: (value) => (value.trim() ? true : 'API key is required'),
          });
        }
      }

      // Step 3: Test connection
      const config: ProviderConfig = {
        name: preset.name,
        endpoint,
        model,
        apiKey,
      };

      const connectionSuccess = await testConnection(config);

      if (!connectionSuccess) {
        const continueAnyway = await confirm({
          message: 'Connection failed. Save configuration anyway?',
          default: false,
        });

        if (!continueAnyway) {
          console.log(chalk.yellow('\n⚠ Configuration not saved.'));
          return;
        }
      }

      // Step 4: Save configuration
      await saveConfig(config);

      console.log(chalk.green('\n✅ Successfully connected to LLM provider!'));
      console.log(chalk.gray('\nYou can now use commands like:'));
      console.log(chalk.cyan('  sca test-llm'));
      console.log(chalk.cyan('  sca ask "your question"'));
    } catch (error) {
      if ((error as any).name === 'ExitPromptError') {
        console.log(chalk.yellow('\n⚠ Setup cancelled.'));
        return;
      }
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
