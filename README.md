# Softnix Code Agent (SCA)

🤖 AI-powered local-first code assistant with privacy and security focus

[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/rujirapongsn2/sca)
[![Tests](https://img.shields.io/badge/tests-104%2F104-brightgreen.svg)](https://github.com/rujirapongsn2/sca)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Quick Install from Source](#option-1-quick-install-from-source-recommended)
  - [Development Mode](#option-2-development-mode-for-contributors)
- [Setting Up Your LLM](#setting-up-your-llm)
  - [Ollama (Local)](#option-a-ollama-easiest---local--free)
  - [LM Studio (Local)](#option-b-lm-studio-gui-friendly)
  - [Cloud Providers](#option-c-cloud-providers-openai-claude-etc)
- [Quick Start Guide](#quick-start-guide)
- [Common Usage Examples](#common-usage-examples)
- [Available Commands](#available-commands)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Architecture](#architecture)
- [Security](#security)
- [Development](#development)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

## Overview

Softnix Code Agent is a CLI tool that runs on your local machine to help with code analysis, refactoring, testing, and more - all while keeping your code private and secure.

**Key Features:**
- 🏠 **Local-first**: Runs entirely on your machine
- 🔒 **Privacy-focused**: Your code never leaves your machine (in strict mode)
- 🛡️ **Security**: Policy gates for all risky operations
- 🤖 **AI-powered**: Works with local LLMs (Ollama, vLLM) or external providers
- 📝 **Memory**: Remembers project conventions and preferences
- 🔍 **Audit**: Complete audit trail of all operations
- 🔧 **Safe Execution**: Allowlist-based command execution
- 📊 **Git Integration**: Status, diff, and commit suggestions

## Requirements

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org))
- **LLM Provider** (choose one):
  - 🏠 **Local** (recommended for privacy): [Ollama](https://ollama.ai), [LM Studio](https://lmstudio.ai), or vLLM
  - ☁️ **Cloud**: OpenAI, Anthropic, Together AI, or any OpenAI-compatible API

## Installation

### Option 1: Quick Install from Source (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/rujirapongsn2/sca.git
cd sca

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Link globally (makes 'sca' command available everywhere)
npm link

# 5. Verify installation
sca --version
```

**That's it!** You can now use `sca` from any directory.

### Option 2: Development Mode (For Contributors)

```bash
# Clone and install
git clone https://github.com/rujirapongsn2/sca.git
cd sca
npm install

# Run without building (slower, for development)
npm run dev

# Or build and run
npm run build
npm start
```

### Option 3: NPM Package (Coming Soon)

```bash
# Will be available soon
npm install -g softnix-code-agent
```

## Setting Up Your LLM

Before using SCA, you need to set up an LLM provider. Here are the easiest options:

### Option A: Ollama (Easiest - Local & Free)

**Step 1:** Install Ollama
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Or download from: https://ollama.ai
```

**Step 2:** Download a model
```bash
# Recommended for coding (4GB)
ollama pull codellama

# Or other models:
ollama pull llama2           # General purpose (4GB)
ollama pull mistral          # Fast & efficient (4GB)
ollama pull deepseek-coder   # Optimized for code (6GB)
```

**Step 3:** Start Ollama (it runs automatically on macOS/Linux)
```bash
ollama serve  # If not already running
```

**That's it!** Ollama runs at `http://localhost:11434` by default.

### Option B: LM Studio (GUI-Friendly)

1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Install and open LM Studio
3. Download a model (e.g., CodeLlama, Mistral)
4. Start the local server (default: `http://localhost:1234`)

### Option C: Cloud Providers (OpenAI, Claude, etc.)

If you prefer using cloud LLMs:
- Get an API key from [OpenAI](https://platform.openai.com/api-keys), [Anthropic](https://console.anthropic.com/), or [Together AI](https://together.ai)
- Keep it ready for the setup step

## Quick Start Guide

Follow these 4 simple steps to get started:

### Step 1: Go to Your Project

```bash
cd /path/to/your/project
```

### Step 2: Initialize SCA

```bash
sca init
```

This creates a `.sca/` directory with:
- ✅ `config.yml` - Configuration file
- ✅ `memory/` - Local memory storage
- ✅ `audit/` - Audit logs
- ✅ `sessions/` - Saved sessions

### Step 3: Connect to Your LLM

Run the interactive setup wizard:

```bash
sca connect
```

**The wizard will ask you:**

1. **Which provider?** (Use arrow keys to select)
   ```
   ❯ Ollama (Local)              # ← If you installed Ollama
     LM Studio (Local)            # ← If you installed LM Studio
     OpenAI
     Anthropic (Claude)
     Together AI
     Custom (OpenAI-compatible)
   ```

2. **Which model?** (e.g., `codellama`, `gpt-4`, `claude-3-sonnet`)

3. **API key?** (only for cloud providers)

4. **Test connection?** The wizard will automatically test your configuration!

**Example for Ollama:**
```
✓ Which provider? → Ollama (Local)
✓ Use default endpoint? → Yes (http://localhost:11434)
✓ Model name? → codellama
✓ Testing connection...
✓ Connection successful! ✅
✓ Configuration saved!
```

**Alternative:** Manual configuration (edit `.sca/config.yml`)
```yaml
model:
  type: local
  endpoint: 'http://localhost:11434'
  model_name: 'codellama'
  temperature: 0.7
  max_tokens: 2048
```

### Step 4: Verify Everything Works

```bash
# Test the LLM connection
sca test-llm

# Scan your repository
sca scan

# Ask your first question!
sca ask "What is the main entry point of this project?"
```

**🎉 You're all set!** SCA is now ready to help with your code.

---

## Real-World Examples

### Example 1: Understanding a New Codebase

```bash
# First, scan the project
$ sca scan

📊 Repository Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tech Stack: JavaScript, TypeScript, React
Entry Points:
  - src/index.tsx
  - src/App.tsx
Files: 156 files
Lines: ~12,450 LOC

# Ask questions about the architecture
$ sca ask "How does authentication work in this app?"

🤖 Based on the codebase:

Authentication is handled through:
1. src/auth/AuthProvider.tsx - Context provider
2. src/hooks/useAuth.ts - Custom hook for auth state
3. JWT tokens stored in localStorage
4. Protected routes in src/routes/PrivateRoute.tsx
...
```

### Example 2: Getting Commit Message Suggestions

```bash
$ sca git suggest

🤖 Suggested commit message:

feat: Add user profile settings page

- Implement profile settings UI with form validation
- Add avatar upload functionality
- Integrate with user preferences API
- Add responsive layout for mobile devices

The changes introduce a new settings page allowing users to
update their profile information and preferences.
```

### Example 3: Running Tests Before Pushing

```bash
$ sca run test --stream

[INFO] Running preset: test - Run tests

 ✓ src/utils/validation.test.ts (12 tests)
 ✓ src/components/Button.test.tsx (8 tests)
 ✓ src/hooks/useAuth.test.ts (15 tests)

 Test Files  24 passed (24)
      Tests  156 passed (156)
   Duration  2.34s

✅ All tests passed!
```

---

## Common Usage Examples

Once you're set up, here's what you can do:

### 📊 Analyze Your Project

```bash
# Get an overview of your codebase
sca scan

# Ask questions about your code
sca ask "Explain the authentication flow"
sca ask "What files handle database operations?"
sca ask "Find all API endpoints"
```

### 🧪 Run Tests & Commands

```bash
# Run your test suite
sca run test

# Run linting
sca run lint

# Run build
sca run build

# Stream output in real-time
sca run test --stream
```

### 📝 Git Operations

```bash
# Check git status
sca git status

# View git diff
sca git diff

# Get AI-generated commit message
sca git suggest
```

### 💾 Manage Memory

```bash
# View stored project knowledge
sca memory show

# View memory statistics
sca memory stats

# Export memory to file
sca memory export

# Forget specific memory
sca memory forget --key "some-key"
```

### 🔧 Other Useful Commands

```bash
# Show help
sca --help

# Show version
sca --version

# Get help for specific command
sca ask --help
sca run --help
```

## Available Commands

### Core Commands

- **`sca init`** - Initialize SCA in current workspace
- **`sca scan`** - Scan and analyze repository structure
- **`sca connect`** - Interactive LLM provider connection setup
  - Supports Ollama, LM Studio, vLLM, OpenAI, Claude, Together AI, and custom OpenAI-compatible endpoints
  - Auto-tests connection and saves configuration
- **`sca test-llm`** - Test LLM connection and configuration

### Agent Commands

- **`sca ask "<question>"`** - Ask the AI agent a question about your code
  ```bash
  sca ask "Explain the authentication flow"
  sca ask "What files handle user data?"
  ```

### Execution Commands

- **`sca run <preset>`** - Run command presets (test/lint/build)
  ```bash
  sca run test          # Run tests
  sca run test --stream # Stream output in real-time
  sca run lint          # Run linter
  sca run build         # Build project
  ```

### Memory Commands

- **`sca memory show`** - Show memory contents
- **`sca memory forget`** - Forget memory entries
  - `-t, --type <type>` - Filter by type (project/user)
  - `-c, --category <category>` - Filter by category
  - `-k, --key <key>` - Filter by key
- **`sca memory stats`** - Show memory statistics
- **`sca memory export`** - Export memory as JSON

### Git Commands

- **`sca git status`** - Show git status with formatting
- **`sca git diff`** - Show git diff
  - `--staged` - Show staged changes
- **`sca git suggest`** - Suggest commit message based on changes

## Configuration

The `.sca/config.yml` file contains all configuration:

### Model Settings

```yaml
model:
  provider: 'local'              # 'local' or 'external'
  endpoint: 'http://localhost:11434'
  model_name: 'codellama'
  temperature: 0.2
  max_tokens: 4096
```

### Security Policies

```yaml
policies:
  # Commands allowed to execute
  exec_allowlist:
    - 'pytest*'
    - 'npm test'
    - 'npm run test'
    - 'go test*'
    - 'cargo test'
    - 'jest*'
    - 'vitest*'

  # Paths allowed for file operations
  path_allowlist:
    - '.'

  # Paths denied (secrets, etc.)
  path_denylist:
    - '.env*'
    - 'secrets/**'
    - '*.pem'
    - '*.key'
    - 'credentials*'

  # Require confirmation for write/exec operations
  require_confirmation: true
```

### Command Presets

```yaml
commands:
  presets:
    test:
      description: 'Run project tests'
      command: 'npm test'
    lint:
      description: 'Run linter'
      command: 'npm run lint'
    build:
      description: 'Build project'
      command: 'npm run build'
```

### Memory Settings

```yaml
memory:
  mode: 'project'  # 'off' | 'project' | 'project+user'
  storage_path: '.sca/memory.db'
```

### Privacy Settings

```yaml
privacy:
  strict_mode: true      # Don't send code to external servers
  redact_secrets: true   # Automatically redact secrets
  audit_log: true        # Keep audit trail
```

## Development

### Project Structure

```
sca/
├── src/
│   ├── cli/          # CLI commands
│   ├── core/         # Config & Policy
│   ├── llm/          # LLM providers
│   ├── agent/        # Agent runtime
│   ├── tools/        # File, Patch, Exec, Git tools
│   ├── memory/       # Memory store
│   ├── security/     # Secret scanner, Audit logger
│   ├── session/      # Session management
│   └── utils/        # Utilities
├── tests/            # Test files (104 tests)
├── docs/             # Documentation
├── PRD.md            # Product Requirements Document
└── PLAN.md           # Development plan
```

### Available Scripts

```bash
npm run dev         # Run in development mode with hot reload
npm run build       # Build for production
npm test            # Run tests (104 tests)
npm run test:watch  # Run tests in watch mode
npm run lint        # Lint code
npm run format      # Format code with Prettier
npm run typecheck   # Type check without emitting
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/policy.test.ts

# Watch mode
npm run test:watch
```

## Architecture

### Core Components

1. **CLI Layer**: Interactive commands with Commander.js
2. **Agent Runtime**: Simple agent loop (analyze → plan → execute)
3. **LLM Provider**: Supports Ollama, vLLM, OpenAI-compatible APIs
4. **Tools Layer**:
   - **FileTools**: Read, scan, grep, tree
   - **PatchTools**: Create diff, apply patches safely
   - **ExecTools**: Execute commands with allowlist
   - **GitTools**: Status, diff, commit suggestions
5. **Memory Layer**: SQLite-based local storage
6. **Policy Gate**: Security checks before risky operations
7. **Security Layer**:
   - Secret Scanner: Detect API keys, tokens, PII
   - Audit Logger: JSON audit trail
8. **Session Management**: Save/restore conversations

## Security

SCA takes security seriously:

### Policy Gates
Every write/exec/network operation requires approval and passes through policy checks.

### Secret Scanner
Automatically detects and can redact:
- API keys (AWS, GitHub, generic)
- Tokens and passwords
- Private keys
- Email addresses (PII)
- Credit card numbers

### Audit Log
Complete trail of all operations stored in `.sca/audit/`:
- Tool executions
- File writes
- Command executions
- Policy violations
- User confirmations

### Strict Mode
When enabled, prevents code from leaving your machine.

### Allowlists
Only approved commands can be executed, preventing dangerous operations.

## Testing

**Test Coverage**: 104/104 tests passing (100%)

Test suites:
- Policy Gate (11 tests)
- LLM Provider (10 tests)
- File Tools (11 tests)
- Patch Tools (11 tests)
- Exec Tools (9 tests)
- Memory Store (15 tests)
- Secret Scanner (13 tests)
- Audit Logger (10 tests)
- Session Manager (14 tests)

## Troubleshooting

### "Command not found: sca"

**Problem:** After installation, `sca` command doesn't work.

**Solutions:**
```bash
# 1. Make sure you ran npm link
cd /path/to/sca
npm link

# 2. Check if Node.js bin is in PATH
echo $PATH  # Should include npm's global bin directory

# 3. On macOS/Linux, add to ~/.bashrc or ~/.zshrc:
export PATH="$PATH:$(npm config get prefix)/bin"

# 4. Reload shell
source ~/.bashrc  # or source ~/.zshrc

# 5. Verify
sca --version
```

### "Cannot connect to LLM"

**Problem:** `sca test-llm` or `sca connect` fails.

**For Ollama:**
```bash
# 1. Check if Ollama is running
curl http://localhost:11434/api/tags

# 2. If not running, start it
ollama serve

# 3. Make sure you have a model downloaded
ollama list
ollama pull codellama  # If no models

# 4. Test again
sca test-llm
```

**For LM Studio:**
```bash
# 1. Open LM Studio app
# 2. Go to "Local Server" tab
# 3. Click "Start Server"
# 4. Note the port (usually 1234)
# 5. Run: sca connect
# 6. Select "LM Studio (Local)"
```

**For Cloud Providers:**
```bash
# 1. Verify your API key is correct
# 2. Check your internet connection
# 3. Make sure endpoint URL is correct:
#    - OpenAI: https://api.openai.com/v1
#    - Anthropic: https://api.anthropic.com/v1
```

### "Config file not found"

**Problem:** Commands say "Config file not found".

**Solution:**
```bash
# Make sure you're in a directory where you ran 'sca init'
cd /path/to/your/project
sca init

# Or check if .sca directory exists
ls -la .sca/
```

### "Permission denied" errors

**Problem:** Can't write files or execute commands.

**Solutions:**
```bash
# 1. Check file permissions
ls -la .sca/

# 2. Fix permissions if needed
chmod -R 755 .sca/

# 3. Make sure you have write access to current directory
touch test.txt  # Should work without errors
rm test.txt
```

### Tests are failing

**Problem:** Running `npm test` shows failed tests.

**Solutions:**
```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Rebuild
npm run build

# 3. Run tests again
npm test

# 4. Run specific test to debug
npm test tests/policy.test.ts -- --reporter=verbose
```

### "Module not found" errors

**Problem:** Import/require errors when running commands.

**Solutions:**
```bash
# 1. Rebuild the project
npm run build

# 2. If using npm link, unlink and relink
npm unlink -g
npm link

# 3. Verify build output exists
ls -la dist/
```

### Slow performance

**Problem:** Commands are very slow to respond.

**Solutions:**
```bash
# 1. Use a smaller/faster model
#    Instead of llama2:70b, use llama2:7b or codellama
ollama pull codellama

# 2. Adjust model settings in .sca/config.yml
model:
  max_tokens: 1024  # Reduce from 2048
  temperature: 0.5  # Lower = faster but less creative

# 3. For cloud providers, check your internet speed

# 4. Use local LLM instead of cloud for better speed
```

### "Out of memory" errors

**Problem:** System runs out of memory.

**Solutions:**
```bash
# 1. Use a smaller model
ollama pull codellama:7b  # Instead of 13b or 70b

# 2. Close other applications

# 3. Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# 4. Check available RAM
# macOS: top -l 1 | grep PhysMem
# Linux: free -h
```

### Need more help?

1. **Check logs:**
   ```bash
   # Audit logs
   cat .sca/audit/audit-*.log | tail -50

   # Run with verbose mode
   sca --verbose test-llm
   ```

2. **Open an issue:** [GitHub Issues](https://github.com/rujirapongsn2/sca/issues)

3. **Include in your issue:**
   - Operating system and version
   - Node.js version (`node --version`)
   - SCA version (`sca --version`)
   - LLM provider and model
   - Full error message
   - Steps to reproduce

---

## Roadmap

### ✅ Phase 1: MVP (Complete)
- ✅ Basic CLI structure
- ✅ Config & policy foundation
- ✅ File operations & repo scanning
- ✅ LLM integration (local + cloud)
- ✅ Interactive LLM connection wizard
- ✅ Agent runtime
- ✅ Patch & diff system
- ✅ Command execution
- ✅ Memory system
- ✅ Security & audit
- ✅ Session management
- ✅ Git integration

### 🚧 Phase 2: Product-grade (Planned)
- Sub-agents (Test, Refactor)
- Advanced repo indexing
- Enhanced security features
- Cross-platform packaging (executable binaries)
- NPM package distribution

### 🔮 Phase 3: Enterprise (Future)
- Organization policies
- Team management
- Internal tool integrations (Jira, Slack, etc.)
- SSO integration

## FAQ

**Q: Is my code safe? Does it get sent to the cloud?**
A: In strict mode, your code never leaves your machine. When using local LLMs (Ollama, LM Studio), everything stays local. With cloud providers, only the specific prompts you send are transmitted.

**Q: Which LLM should I use?**
A: For privacy: Use Ollama with CodeLlama. For best results: Use Claude 3.5 Sonnet or GPT-4. For balance: Use local Mistral or DeepSeek-Coder.

**Q: How much does it cost?**
A: SCA is free. Local LLMs are free. Cloud LLMs charge per token (typically $0.01-0.10 per 1K tokens).

**Q: Can I use it offline?**
A: Yes, if you use a local LLM (Ollama, LM Studio, vLLM).

**Q: Does it support Windows?**
A: The architecture is cross-platform compatible. Windows packaging coming in Phase 2.

**Q: Can I contribute?**
A: Yes! See CONTRIBUTING.md for guidelines.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

For issues and questions, please open an issue on GitHub.

---

**Status**: ✅ MVP Complete (Phase 1)

**Version**: 0.1.0

**Test Coverage**: 104/104 tests passing
