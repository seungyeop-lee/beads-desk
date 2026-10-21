# Contributing to beads-desk

Bug reports and feature ideas are welcome as GitHub issues. Pull requests are not accepted: the repository settings allow only collaborators to open them.

## Issues

- To report a bug, open a [Bug report](https://github.com/seungyeop-lee/beads-desk/issues/new?template=bug_report.yml) issue.
- To suggest a new feature or a change, open a [Feature request](https://github.com/seungyeop-lee/beads-desk/issues/new?template=feature_request.yml) issue.
- To report a security vulnerability, follow [SECURITY.md](SECURITY.md). Do not open a public issue for it.

You can write issues in English or Korean.

## Language

Code comments, test names, commit messages, [`AGENTS.md`](AGENTS.md), and `docs/` in this repository are written in Korean. `AGENTS.md` describes the repository structure, layer boundaries, and coding conventions. Read it, with a translator if needed, before changing code under `packages/`.

## Development setup

Development and the verification commands below are supported on macOS and Linux only. On Windows, only installing and running the published package is supported.

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

To install the repository's current code as the global `bd-desk`, run `pnpm run install:global` at the repository root. It installs with `pnpm add -g`, so it needs the global bin directory that `pnpm setup` creates. To remove it, run `pnpm run uninstall:global`.

## Verification

Run these after changing code:

| Command             | When to run                                                           | What it runs                                                                                          |
| ------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm run check`    | Always                                                                | Typecheck, lint, format check, unit tests, component tests, and the e2e test count limit              |
| `pnpm run test:e2e` | You changed a screen or an API that a screen calls                    | Builds the app for production and runs the Playwright scenarios in `packages/app/e2e`                 |
| `pnpm run test:bd`  | You changed how `packages/bd` parses `bd` output, or you updated `bd` | Runs the `packages/bd` adapter against the installed `bd` in a temporary workspace (about 15 seconds) |

If `pnpm run check` fails only on formatting, run `pnpm run format` to fix it.

If it fails because the number of e2e tests exceeds `limit` in `packages/app/e2e/testLimit.json`, first try to cover the new behavior with a unit test, a component test, or extra steps in an existing e2e test. If a new e2e test is still needed, raise `limit` and add one entry to `reasons` for each added test, naming the spec and the flow that unit and component tests cannot check.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, for example `fix(app): keep the selected workspace after restart`. The scope names the affected package or area, such as `app` for `packages/app`, `bd` for `packages/bd`, or `e2e`. Omit the scope for changes that are not tied to one area, such as documentation at the repository root.
