# Softnix Code Agent (SCA)

🤖 AI-powered local-first code assistant with privacy and security focus

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

- Node.js >= 18.0.0
- A local LLM server (e.g., [Ollama](https://ollama.ai)) or external LLM API access

## Installation

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd sca

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run built version
npm start
```

### From Source

```bash
# Build and link globally
npm run build
npm link

# Now you can use 'sca' command globally
sca --help
```

## Quick Start

### 1. Initialize SCA in your project

```bash
cd /path/to/your/project
sca init
```

This creates a `.sca/` directory with:
- `config.yml` - Configuration file
- `memory/` - Local memory storage
- `audit/` - Audit logs
- `sessions/` - Session management

### 2. Configure your LLM

Edit `.sca/config.yml` to point to your LLM:

```yaml
model:
  provider: 'local'
  endpoint: 'http://localhost:11434'  # Ollama default
  model_name: 'codellama'
```

### 3. Test LLM Connection

```bash
sca test-llm
```

### 4. Start using SCA

```bash
# Scan repository
sca scan

# Ask questions
sca ask "What is the main entry point of this project?"

# Run tests
sca run test

# Check git status
sca git status

# Get commit message suggestion
sca git suggest
```

## Available Commands

### Core Commands

- **`sca init`** - Initialize SCA in current workspace
- **`sca scan`** - Scan and analyze repository structure
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

## Roadmap

### ✅ Phase 1: MVP (Complete)
- Basic CLI structure
- Config & policy foundation
- File operations & repo scanning
- LLM integration
- Agent runtime
- Patch & diff system
- Command execution
- Memory system
- Security & audit
- Session management
- Git integration

### 🚧 Phase 2: Product-grade (Planned)
- Sub-agents (Test, Refactor)
- Advanced repo indexing
- Enhanced security features
- Cross-platform packaging

### 🔮 Phase 3: Enterprise (Future)
- Organization policies
- Team management
- Internal tool integrations

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
