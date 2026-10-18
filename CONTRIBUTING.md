# Contributing to beads-desk

Bug reports, feature requests, and pull requests are welcome. To report a security vulnerability, follow [SECURITY.md](SECURITY.md) instead of opening an issue.

## Language

Code comments, test names, commit messages, [`AGENTS.md`](AGENTS.md), and `docs/` in this repository are written in Korean. You do not need to write Korean to contribute: issues and pull requests in English are welcome.

`AGENTS.md` describes the repository structure, layer boundaries, and coding conventions. Read it, with a translator if needed, before changing code under `packages/`.

## Development setup

You need:

- Node.js 24 or later. If you use nvm, run `nvm use` at the repository root to select the version in `.nvmrc`.
- pnpm, at the version in the `packageManager` field of the root `package.json`.
- The `bd` CLI, to run the app, `pnpm run test:e2e`, and `pnpm run test:bd`.

Install dependencies at the repository root:

```sh
pnpm install
```

This also installs the git hooks (lefthook). The pre-commit hook formats and lints staged files, and the pre-push hook runs `pnpm run check`.

Install chromium once for the component tests and the e2e tests:

```sh
pnpm run test:e2e:install
```

To run the app in development mode against a beads workspace:

```sh
BEADS_DESK_WORKSPACE=<path to a beads workspace> pnpm run dev
```

If you change `packages/bd` while `pnpm run dev` is running, restart it; the server keeps running `bd` with the old code until then.

## Verification

Run these before opening a pull request:

| Command             | When to run                                                           | What it runs                                                                                          |
| ------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm run check`    | Always                                                                | Typecheck, lint, format check, unit tests, and component tests                                        |
| `pnpm run test:e2e` | You changed a screen or an API that a screen calls                    | Builds the app for production and runs the Playwright scenarios in `packages/app/e2e`                 |
| `pnpm run test:bd`  | You changed how `packages/bd` parses `bd` output, or you updated `bd` | Runs the `packages/bd` adapter against the installed `bd` in a temporary workspace (about 15 seconds) |

If `pnpm run check` fails only on formatting, run `pnpm run format` to fix it.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, for example `fix(app): keep the selected workspace after restart`. The scope names the affected package or area, such as `app` for `packages/app`, `bd` for `packages/bd`, or `e2e`. Omit the scope for changes that are not tied to one area, such as documentation at the repository root.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
