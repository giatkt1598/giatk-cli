# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the CLI source. Commands live in `src/commands/`, shared runtime logic in `src/services/`, argument parsing and config loading in `src/infrastructures/`, reusable decorators in `src/decorators/`, and cross-cutting helpers in `src/utilities/`. Tests currently live in `tests/`. Build output is generated into `dist/` and should not be edited by hand. Runtime defaults are stored in `appsettings.json`.

## Build, Test, and Development Commands

Use `npm run dev` to run the CLI from `src/index.ts` in watch mode. Use `npm run dev:example` to exercise the sample `hello` command with arguments. Use `npm run build` to clean `dist/` and bundle the CLI with `esbuild`, then `npm run serve` to execute the built artifact. Use `npm test` for a one-shot Vitest run and `npm run test:watch` while iterating.

## Coding Style & Naming Conventions

This repo uses TypeScript with ESM imports and strict compiler settings. Follow the existing style: 2-space indentation, double quotes, and small focused modules. Keep path aliases under `@/*` for source imports when appropriate. Match established file names such as `sample.command.ts`, `cli.service.ts`, `description.decorator.ts`, and `helper.test.ts`. Prefer descriptive class and method names over abbreviations.

## Testing Guidelines

Vitest is the active test framework. Add tests under `tests/` using `*.test.ts` names and behavior-oriented `describe`/`it` blocks. Cover command parsing, validation decorators, helper utilities, and service behavior where changes affect CLI output or runtime configuration. Run `npm test` before opening a PR.

## Commit & Pull Request Guidelines

Recent history uses short imperative subjects, usually `feat:` or `fix:`, with occasional ticket-prefixed messages such as `[feat] [GIA-15] add JiraService class with constructor`. Keep commits focused and easy to scan. Pull requests should summarize behavior changes, mention related issue or ticket IDs when available, and include test evidence. If a change affects command output or help text, include a short CLI example in the PR description.

## Configuration Notes

The CLI reads `appsettings.json` first, then `appsettings.{NODE_ENV}.json` when present. Do not hardcode environment-specific values in commands or services; keep them in configuration and document new keys when added.
