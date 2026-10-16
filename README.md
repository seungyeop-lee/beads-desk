# beads-desk

_English · [한국어](README.ko.md)_

A local web UI for the [Beads](https://github.com/steveyegge/beads) (`bd`) issue tracker. View and edit issues, epics, the board, and decisions in your browser. Changes you make with `bd` in the terminal show up on screen within a few seconds.

## Requirements

- Node.js 22 or later
- pnpm (needed only for installation)
- The `bd` CLI. If it is not on your `PATH`, set the `BD_BIN` environment variable to the path of the executable. Tested with `bd` 1.3.1.
- A beads workspace created with `bd init` (a directory containing a `.beads` directory)

## Installation

beads-desk is not published to npm yet, so build it from the repository and install it globally. Run `pnpm setup` once beforehand so that pnpm can install global commands.

Run the following from the repository root.

```sh
pnpm install
pnpm run install:global
```

To update, pull the latest repository and run the same commands again. A running server keeps the old version until you run `bd-desk restart`.

To uninstall, run `pnpm run uninstall:global`.

## Usage

Run the command in a beads workspace directory or any of its subdirectories. In a worktree of a git repository that has `.beads`, the worktree becomes the workspace and shows the main repository's issues, as bd does.

```sh
bd-desk start --open
```

The server starts in the background, and the UI is available at the printed URL (`http://127.0.0.1:3000` by default). The server accepts requests only from this computer (`127.0.0.1`).

### Commands

- `bd-desk start`: Starts the server. Running `bd-desk` without a command also runs `start`. If a server is already running, it does not start a new one; instead, it adds the workspace of the current directory and makes it the current workspace.
- `bd-desk stop`: Stops the server. Exits with code 2 if no server is running.
- `bd-desk restart`: Restarts the server on the same port. Added workspaces and the current workspace are kept.

### Options

- `--port <number>`: Sets the server port. If omitted, the first free port starting from 3000 is used. To change the port of a running server, run `bd-desk restart --port <number>`.
- `--open`: Opens the browser once the server is ready.

If you add two or more workspaces, you can switch between them with the selector at the top right of the screen. Switching in one tab also switches every other open tab.

## File locations

The server state file (`server.json`) and log (`server.log`) are stored in `$XDG_RUNTIME_DIR/beads-desk`. If `XDG_RUNTIME_DIR` is not set, they are stored in `beads-desk` under the OS temporary directory. If the server fails to start, check `server.log`.

## Troubleshooting

The CLI prints these messages in Korean.

- `beads workspace를 찾지 못했습니다` (beads workspace not found): Run the command in a directory containing `.beads` or one of its subdirectories. If this is a new directory, run `bd init` first.
- `경고: 서버가 bd를 실행하지 못했습니다` (warning: the server could not run bd): Add `bd` to your `PATH` or set `BD_BIN`, then run `bd-desk restart`.
- `실행 중인 서버(pid …)가 응답하지 않습니다` (the running server (pid …) is not responding): Stop it with `bd-desk stop`, then start it again.

## Development

The repository structure, verification commands, and coding conventions are described in the repository's `AGENTS.md` (written in Korean).
