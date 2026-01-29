/**
 * Run command - Execute command presets
 */

import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../../utils/logger.js';
import { getConfigManager } from '../../core/config.js';
import { PolicyGate } from '../../core/policy.js';
import { ExecTools } from '../../tools/exec-tools.js';

export async function runCommand(presetName: string, options: { stream?: boolean } = {}): Promise<void> {
  try {
    // Load config
    const configManager = getConfigManager();
    const policyConfig = configManager.getPolicyConfig();
    const commandPresets = configManager.getCommandPresets();

    // Check if preset exists
    if (!commandPresets[presetName]) {
      logger.error(`Preset not found: ${presetName}`);
      logger.log('');
      logger.log('Available presets:');
      Object.entries(commandPresets).forEach(([name, preset]) => {
        logger.log(`  ${chalk.cyan(name)}: ${preset.description}`);
      });
      process.exit(1);
    }

    const preset = commandPresets[presetName];
    logger.info(`Running: ${preset.description}`);
    logger.log(`Command: ${chalk.gray(preset.command)}`);
    logger.log('');

    // Create policy gate and exec tools
    const policyGate = new PolicyGate(policyConfig);
    const execTools = new ExecTools(process.cwd(), policyGate);

    // Execute with or without streaming
    let result;

    if (options.stream) {
      // Streaming mode
      result = await execTools.executeStream(preset.command, (data) => {
        process.stdout.write(data);
      }, {
        cwd: preset.cwd,
        env: preset.env,
      });
    } else {
      // Non-streaming mode
      const spinner = ora('Executing...').start();

      result = await execTools.execute(preset.command, {
        cwd: preset.cwd,
        env: preset.env,
      });

      spinner.stop();

      // Show output
      if (result.stdout) {
        logger.log(result.stdout);
      }

      if (result.stderr) {
        logger.log(chalk.gray(result.stderr));
      }
    }

    logger.log('');

    // Show result
    if (result.success) {
      logger.success(`✨ Command completed successfully (exit code: ${result.exitCode})`);
    } else {
      logger.error(`Command failed (exit code: ${result.exitCode})`);
      if (result.error) {
        logger.error(result.error);
      }
      process.exit(result.exitCode);
    }
  } catch (error) {
    logger.error('Run command failed:');
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}
