/**
 * Exec Tools - Safe command execution with allowlist
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import type { PolicyGate } from '../core/policy.js';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxBuffer?: number;
}

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  error?: string;
}

export interface CommandPreset {
  description: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

export class ExecTools {
  constructor(
    private workspaceRoot: string,
    private policyGate?: PolicyGate
  ) {}

  /**
   * Execute a command with policy check
   */
  async execute(command: string, options: ExecOptions = {}): Promise<ExecResult> {
    const {
      cwd = this.workspaceRoot,
      env = {},
      timeout = 120000, // 2 minutes default
      maxBuffer = 10 * 1024 * 1024, // 10MB
    } = options;

    // Policy check
    if (this.policyGate) {
      const checkResult = this.policyGate.checkTool(
        {
          name: 'executeCommand',
          description: `Execute: ${command}`,
          risk_level: 'exec',
          requires_confirmation: true,
        },
        { command }
      );

      if (!checkResult.allowed) {
        return {
          success: false,
          stdout: '',
          stderr: '',
          exitCode: -1,
          command,
          error: `Policy denied: ${checkResult.reason}`,
        };
      }
    }

    logger.debug(`Executing: ${command}`);

    try {
      // Merge with process env, but scrub sensitive variables
      const safeEnv = this.scrubEnvironment({ ...process.env, ...env });

      const { stdout, stderr } = await execAsync(command, {
        cwd,
        env: safeEnv,
        timeout,
        maxBuffer,
      });

      logger.debug(`Command completed successfully`);

      return {
        success: true,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: 0,
        command,
      };
    } catch (error: any) {
      const exitCode = error.code || -1;
      const stdout = error.stdout?.toString() || '';
      const stderr = error.stderr?.toString() || '';

      logger.debug(`Command failed with exit code ${exitCode}`);

      return {
        success: false,
        stdout,
        stderr,
        exitCode,
        command,
        error: error.message,
      };
    }
  }

  /**
   * Execute a command with streaming output
   */
  async executeStream(
    command: string,
    onOutput: (data: string) => void,
    options: ExecOptions = {}
  ): Promise<ExecResult> {
    const { cwd = this.workspaceRoot, env = {}, timeout = 120000 } = options;

    // Policy check
    if (this.policyGate) {
      const checkResult = this.policyGate.checkTool(
        {
          name: 'executeCommand',
          description: `Execute: ${command}`,
          risk_level: 'exec',
          requires_confirmation: true,
        },
        { command }
      );

      if (!checkResult.allowed) {
        return {
          success: false,
          stdout: '',
          stderr: '',
          exitCode: -1,
          command,
          error: `Policy denied: ${checkResult.reason}`,
        };
      }
    }

    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');
      const safeEnv = this.scrubEnvironment({ ...process.env, ...env });

      const child = spawn(cmd, args, {
        cwd,
        env: safeEnv,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      // Handle timeout
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
      }, timeout);

      // Capture stdout
      child.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        onOutput(text);
      });

      // Capture stderr
      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        onOutput(text);
      });

      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timeoutId);

        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code || -1,
          command,
        });
      });

      // Handle errors
      child.on('error', (error) => {
        clearTimeout(timeoutId);

        resolve({
          success: false,
          stdout,
          stderr,
          exitCode: -1,
          command,
          error: error.message,
        });
      });
    });
  }

  /**
   * Execute a command preset
   */
  async executePreset(
    presetName: string,
    presets: Record<string, CommandPreset>
  ): Promise<ExecResult> {
    const preset = presets[presetName];

    if (!preset) {
      return {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: -1,
        command: presetName,
        error: `Preset not found: ${presetName}`,
      };
    }

    logger.info(`Running preset: ${presetName} - ${preset.description}`);

    return this.execute(preset.command, {
      cwd: preset.cwd,
      env: preset.env,
    });
  }

  /**
   * Scrub sensitive environment variables
   */
  private scrubEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const scrubbed: NodeJS.ProcessEnv = {};

    // Allowlist of safe variables
    const allowlist = [
      'PATH',
      'HOME',
      'USER',
      'SHELL',
      'LANG',
      'PWD',
      'NODE_ENV',
      'NODE_OPTIONS',
      'NPM_CONFIG_',
    ];

    for (const [key, value] of Object.entries(env)) {
      // Keep if matches allowlist
      if (allowlist.some((prefix) => key.startsWith(prefix))) {
        scrubbed[key] = value;
      }
      // Filter out sensitive keys
      else if (
        key.includes('SECRET') ||
        key.includes('PASSWORD') ||
        key.includes('TOKEN') ||
        key.includes('API_KEY') ||
        key.includes('PRIVATE')
      ) {
        logger.debug(`Scrubbed environment variable: ${key}`);
        // Don't include
      } else {
        // Include other variables
        scrubbed[key] = value;
      }
    }

    return scrubbed;
  }

  /**
   * Check if command is safe to run (basic validation)
   */
  isSafeCommand(command: string): boolean {
    const dangerous = [
      'rm -rf /',
      'format',
      'mkfs',
      'dd if=',
      '> /dev/',
      'chmod -R 777',
      'chown -R',
    ];

    const lower = command.toLowerCase();
    return !dangerous.some((pattern) => lower.includes(pattern.toLowerCase()));
  }
}
