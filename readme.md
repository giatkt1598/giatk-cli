# GIATK CLI

A TypeScript-first Node.js CLI with a decorator-based command system, typed argument validation, and environment-aware configuration.

## Highlights

- Decorator-based command registration (`@Command`)
- Typed command options with `class-validator` + `class-transformer`
- Built-in help rendering for root and per-command usage
- Global CLI utilities:
  - `--help`
  - `--version` / `-v`
  - `--update`
  - `--config`
- Environment override support (`appsettings.{NODE_ENV}.json`)
- Fast bundling via `esbuild`
- Unit testing with `vitest`

## Requirements

- Node.js 18+ (build target is `node18`)
- npm or yarn

## Installation

### Install globally from local source

```bash
npm run cli:install
```

### Uninstall global link

```bash
npm run cli:uninstall
```

## Usage

```bash
giatk [command] [subcommand] [options]
```

### Global options

- `--help` Show help
- `--version`, `-v` Show CLI version and build info
- `--update` Pull latest CLI version from the main branch and rebuild
- `--config` Open runtime configuration file (`appsettings.production.json`)

### Built-in commands

- `auth login`: Demonstrates receiving input from a local browser form and continuing in the CLI.
- `sample`: Demonstrates typed options, validation, logging, async processing, and custom decorators.
- Commands can be organized in nested folders and named with a command path, such as `docker start`.

Examples:

```bash
giatk --help
giatk auth login
giatk sample --help
giatk sample --name Alice --times 3 --date 2025-01-23 --dry-run
giatk docker start -n my-container
giatk docker --help
```

## Command Development Guide

Commands are TypeScript modules under `src/commands/` with the `.command.ts` suffix. The CLI discovers them automatically. Folder structure is organizational; the `@Command` decorator defines the canonical command name.

### Command lifecycle

Every command should:

1. Declare its name and help metadata with `@Command`.
2. Define typed options when it accepts arguments.
3. Validate and transform input through decorators.
4. Implement its behavior in `executeAsync()`.

For example, create `src/commands/greet.command.ts`:

```ts
import { CommandOf } from "./base/base.command.js";
import { Command } from "./base/command.decorator.js";
import { Description, Shortcut } from "@/decorators/index.js";
import { IsString, MinLength } from "class-validator";

class GreetOptions {
  @Description("Name to greet")
  @Shortcut("n")
  @IsString()
  @MinLength(1)
  name!: string;
}

@Command("greet", {
  description: "Greet a user.",
  example: "greet -n Alice",
  shortcut: "g",
})
export class GreetCommand extends CommandOf(GreetOptions) {
  async executeAsync(): Promise<void> {
    console.log(`Hello ${this.args.name}!`);
  }
}
```

Use `BaseCommand` for commands without typed options. Use `CommandOf<TOptions>` when the command needs validated arguments. Add `@Description` for help text, `@Shortcut` for short options, and `@IsOptional` or default values for non-required fields.

Run and verify the command:

```bash
npm run dev greet -n Alice
npm run dev greet --help
npm run build
giatk greet -n Alice
```

For a nested command, place the module in a descriptive folder and use the full command path in the decorator. For example, `src/commands/docker/docker-start.command.ts` can use `@Command("docker start")` and run as `giatk docker start -n my-container`. The same discovery, validation, help, and execution rules apply to both top-level commands and subcommands.

Add behavior-oriented tests under `tests/` using the `*.test.ts` convention. Cover option parsing, validation failures, command output, and service interactions when applicable. Run `npm test` before committing, then run `npm run build` to verify command discovery and the generated CLI artifact.

## Configuration

The CLI loads settings in this order:

1. `appsettings.json`
2. `appsettings.{NODE_ENV}.json` (if it exists)

If `NODE_ENV` is not set, the default is `production`.

`--config` creates `appsettings.production.json` from `appsettings.json` if missing, then opens it in your OS default editor. If the production file already exists, new string keys are added with empty values and other types with `null`, without overwriting existing values. Keys absent from `appsettings.json` are removed, including nested keys.

## Development

### Run in watch mode

```bash
npm run dev
```

### Build output

```bash
npm run build
```

Artifacts are generated in `dist/`. The build also writes `dist/package.json` with the package `name`, `version`, the Git commit hash in `buildVersion`, and `type: "module"` so Node.js loads the ESM build without a warning.

## Testing

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

## Project Structure

```text
src/
  commands/         # CLI commands and nested command groups
    docker/         # Docker subcommands
  decorators/       # Validation/description decorators
  infrastructures/  # Argument parsing, help rendering, settings loading
  services/         # CLI runtime services
  utilities/        # Shared utilities
```

## Tech Stack

- TypeScript (ESM)
- esbuild
- class-validator
- class-transformer
- vitest

## License

ISC
