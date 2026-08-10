# GIATK CLI

A TypeScript-first Node.js CLI with a decorator-based command system, typed argument validation, and environment-aware configuration.

## Highlights

- Decorator-based command registration (`@Command`)
- Typed command options with `class-validator` + `class-transformer`
- Built-in help rendering for root and per-command usage
- Global CLI utilities:
  - `--help`
  - `--version` / `-v`
  - `--upgrade`
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
giatk [command] [options]
```

### Global options

- `--help` Show help
- `--version`, `-v` Show CLI version and build info
- `--upgrade` Pull latest CLI version from the main branch and rebuild
- `--config` Open runtime configuration file (`appsettings.production.json`)

### Built-in commands

- `hello`: Print a simple hello message.
- `login`: Demonstrates receiving input from a local browser form and continuing in the CLI.
- `sample`: Demonstrates typed options, validation, logging, async processing, and custom decorators.

Examples:

```bash
giatk --help
giatk hello
giatk login
giatk sample --help
giatk sample --name Alice --times 3 --date 2025-01-23 --dry-run
```

## Configuration

The CLI loads settings in this order:

1. `appsettings.json`
2. `appsettings.{NODE_ENV}.json` (if it exists)

If `NODE_ENV` is not set, the default is `production`.

`--config` creates `appsettings.production.json` from `appsettings.json` if missing, then opens it in your OS default editor.

## Development

### Run in watch mode

```bash
npm run dev
```

### Build output

```bash
npm run build
```

Artifacts are generated in `dist/`.

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
  commands/         # CLI commands
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
