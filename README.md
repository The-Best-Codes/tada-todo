# Tada Todo

A simple and powerful CLI tool to manage TODO files across your repositories. Built with Bun, TypeScript, and designed for an excellent developer experience.

## Features

- 🚀 **Interactive setup** with beautiful prompts
- 📁 **Smart file management** with automatic scanning and updates
- 🔄 **Sync capabilities** between filesystem and configuration
- 🗂️ **Multiple storage formats** (JSON or MessagePack)
- 🧹 **Cleanup tools** to maintain your TODO files
- 📝 **Task management** with date-based organization and bulk operations
- ⚡ **Fast and efficient** with hash-based change detection

## Installation

```bash
# Install globally
npm install -g tada-todo

# Or use with npx
npx tada-todo --help
```

## Quick Start

1. **Initialize** a new TODO configuration in your project:

   ```bash
   tada-todo init
   ```

2. **Create** a new TODO file:

   ```bash
   tada-todo new
   ```

3. **Keep everything in sync**:
   ```bash
   tada-todo update --scan
   ```

## Commands

### `tada-todo init`

Initialize a new TODO configuration in the current directory.

```bash
# Interactive setup
tada-todo init

# Non-interactive (for CI/CD)
tada-todo init --non-interactive

# With custom options
tada-todo init --options "newFileName=TASKS.md,humanReadable=true,saveInConfig=true"
```

**Options:**

- `--non-interactive` - Use defaults without prompting (for CI/CD environments)
- `--options <options>` - Comma-separated list of key=value pairs for configuration

**Configuration Options:**

- `newFileName` - Name for new TODO files (default: `TODO.md`)
- `humanReadable` - Use JSON instead of MessagePack (default: `false`)
- `saveInConfig` - Store TODO file contents in config (default: `false`)

### `tada-todo new`

Create a new TODO file in the current directory.

```bash
# Create in current directory
tada-todo new

# With custom config
tada-todo new --config path/to/config.json --type json
```

**Options:**

- `--config <path>` - Path to the configuration file
- `--type <type>` - Configuration file type (`json`|`msgpack`|`auto`)

**Generated TODO Template:**

```markdown
## July 1, 2025

- [ ] This is a task that needs done.
- [x] This task is finished.

---

Add new items to the top of the file.
Generated on July 1, 2025 by tada-todo CLI.
```

### `tada-todo generate`

Generate all TODO files from the configuration (useful when `saveInConfig` is enabled).

```bash
# Generate all saved files
tada-todo generate

# With custom config
tada-todo generate --config path/to/config.json
```

**Options:**

- `--config <path>` - Path to the configuration file
- `--type <type>` - Configuration file type (`json`|`msgpack`|`auto`)

### `tada-todo update`

Update saved files in configuration from filesystem with intelligent change detection.

```bash
# Update all tracked files
tada-todo update

# Update a specific file
tada-todo update TODO.md

# Scan for new TODO files and update all
tada-todo update --scan
```

**Options:**

- `--config <path>` - Path to the configuration file
- `--type <type>` - Configuration file type (`json`|`msgpack`|`auto`)
- `--scan` - Scan for TODO files not yet in configuration

**Features:**

- Hash-based change detection for efficiency
- Automatic discovery of new TODO files
- Smart directory traversal (skips `node_modules`, `.git`, etc.)

### `tada-todo prune`

Remove saved files from configuration that no longer exist on filesystem.

```bash
# Interactive cleanup
tada-todo prune
```

**Options:**

- `--config <path>` - Path to the configuration file
- `--type <type>` - Configuration file type (`json`|`msgpack`|`auto`)

**Features:**

- Interactive file selection
- Safety warnings and confirmations
- Detailed preview of changes

### `tada-todo manage add-date [date]`

Add a new date heading to your TODO file in the current directory.

```bash
# Add today's date
tada-todo manage add-date

# Add a specific date
tada-todo manage add-date "July 1, 2025"

# Add to all TODO files in configuration (global)
tada-todo manage add-date --global

# With custom config
tada-todo manage add-date --config path/to/config.json
```

**Options:**

- `--config <path>` - Path to the configuration file
- `--type <type>` - Configuration file type (`json`|`msgpack`|`auto`)
- `--global` - Add date heading to all TODO files in configuration (instead of just current directory)

**Behavior:**

- By default, only operates on TODO files in the current directory
- Use `--global` flag to operate on all saved files in configuration
- Creates proper date heading format with spacing

### `tada-todo manage add-task <task> [date]`

Add a new task to a specific date in your TODO file in the current directory.

```bash
# Add task to today's date
tada-todo manage add-task "Review pull requests"

# Add task to a specific date
tada-todo manage add-task "Meeting with team" "July 1, 2025"

# Disable auto-creation of date headings
tada-todo manage add-task "Important task" --no-auto-create-date

# With custom config
tada-todo manage add-task "Task" --config path/to/config.json
```

**Options:**

- `--config <path>` - Path to the configuration file
- `--type <type>` - Configuration file type (`json`|`msgpack`|`auto`)
- `--no-auto-create-date` - Disable auto-creation of date headings if they don't exist

**Behavior:**

- Always operates only on TODO files in the current directory (never global)
- Auto-creates date headings if they don't exist (unless `--no-auto-create-date` is used)
- Maintains proper spacing: date heading, blank line, then tasks
- Tasks are added as `- [ ] Task description`

### `tada-todo manage move-tasks [date]`

Move all unresolved tasks from different dates to the current date or a specific date.

```bash
# Move all unresolved tasks to today's date
tada-todo manage move-tasks

# Move all unresolved tasks to a specific date
tada-todo manage move-tasks "July 1, 2025"

# Move tasks in all TODO files in configuration (global)
tada-todo manage move-tasks --global

# Move tasks to specific date in all files
tada-todo manage move-tasks "July 1, 2025" --global

# With custom config
tada-todo manage move-tasks --config path/to/config.json
```

**Options:**

- `--config <path>` - Path to the configuration file
- `--type <type>` - Configuration file type (`json`|`msgpack`|`auto`)
- `--global` - Move tasks in all TODO files in configuration (instead of just current directory)

**Behavior:**

- **Moves**: All unresolved tasks (those with `- [ ]`) from all date sections to the target date
- **Keeps in place**: Completed tasks (`- [x]` or `- [X]`) and other content
- **Creates target date**: If the target date heading doesn't exist, it will be created
- **Cleans up empty sections**: Date sections with only unresolved tasks are removed after moving
- **Preserves sections with completed tasks**: Date sections with completed tasks remain

**Example Transformation:**

Before:

```markdown
## January 15, 2025

- [ ] Unresolved task 1
- [x] Completed task

## January 10, 2025

- [ ] Unresolved task 2
- [ ] Unresolved task 3

## January 20, 2025

- [x] Existing completed task
```

After running `move-tasks "January 20, 2025"`:

```markdown
## January 15, 2025

- [x] Completed task

## January 20, 2025

- [ ] Unresolved task 1
- [ ] Unresolved task 2
- [ ] Unresolved task 3
- [x] Existing completed task
```

Note: The January 10 section gets completely removed since it only had unresolved tasks.

## Configuration

Tada Todo creates either `tada-todo.json` (human-readable) or `tada-todo.b` (MessagePack) files:

```json
{
  "newFileName": "TODO.md",
  "humanReadable": false,
  "saveInConfig": false,
  "savedFiles": [
    {
      "name": "TODO.md",
      "dirRelativeToConf": "src/components",
      "content": "## July 1, 2025\n\n- [ ] Fix the header component\n...",
      "hash": "a1b2c3d4e5f6..."
    }
  ]
}
```

## Workflows

### Basic Workflow

```bash
# Set up in your project
tada-todo init

# Create TODO files as needed
tada-todo new
cd src/components && tada-todo new
cd ../../docs && tada-todo new

# Keep everything in sync
tada-todo update --scan
```

### CI/CD Integration

```bash
# Non-interactive setup
tada-todo init --non-interactive --options "saveInConfig=true"

# Generate files in CI
tada-todo generate
```

### Maintenance

```bash
# Update all files and scan for new ones
tada-todo update --scan

# Clean up missing files
tada-todo prune
```

## Why Tada Todo?

- **Consistent**: Same TODO format across all your projects
- **Flexible**: Works with any project structure
- **Efficient**: Smart change detection and minimal overhead
- **Safe**: Multiple confirmations before destructive operations
- **Developer-friendly**: Beautiful CLI interface with helpful prompts

## Contributing

Built with [Bun](https://bun.sh), [Commander.js](https://github.com/tj/commander.js), [Clack](https://github.com/bombshell-dev/clack), and [Kleur](https://github.com/lukeed/kleur).

## License

MIT
