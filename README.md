# beads-desk

English | [한국어](https://github.com/seungyeop-lee/beads-desk/blob/main/README.ko.md)

A local web UI for the [Beads](https://github.com/steveyegge/beads) (`bd`) issue tracker. Read and edit your issues in the browser while you and your agents keep using `bd` in the terminal.

## Features

### See what to do now

- **Now**: The start page. Shows what is in progress, what is up next, what is blocked, how far each open epic has come, and how many issues were created and closed over the last 7 days.
- **Needs human**: Collects the questions (issues labeled `human`) and human gates that agents handed to a person. Respond or dismiss them on this screen; your response is saved as a comment, and closing a gate unblocks the issues waiting on it.
- **Decisions**: Lists `decision` issues on their own screen, split into active and closed decisions, with the decisions each one supersedes or is superseded by.

### See how work connects

- **Linked issues**: The issue detail lists the issues linked to it by relation, such as Blocked by, Blocks, Parent, Child, and Related. Click one to read it in a side panel next to the issue you are on.
- **Graph**: Next to Linked issues, Blocks graph opens the blocks chain around the issue, with prerequisite work on the left and dependent work on the right. For an epic, View order arranges its issues into stages by their blocks dependencies; issues in the same stage can proceed in parallel.

### Manage the flow

- **Board**: A kanban board with Blocked, Ready, In progress, and Closed columns. Drag a card to Ready, In progress, or Closed to change its status.

### Work alongside the CLI

- **Live updates**: Changes made with `bd` in the terminal, by you or by an agent, appear on every open tab within a few seconds without reloading.

The UI also has Issues, Epics, and Hygiene screens. It is available in English and Korean and follows your browser's language; to change it, open Settings (the gear icon at the top right).

## Requirements

- macOS or Linux. Tested on macOS with `bd` 1.3.1. Windows is not supported.
- Node.js 22 or later
- The `bd` CLI. If `bd` is not on your `PATH`, set the `BD_BIN` environment variable to the path of the executable when you start the server.
- A beads workspace: a directory where you ran `bd init`, so it contains a `.beads` directory

## Installation

With npm:

```sh
npm install -g @seungyeop-lee/beads-desk
```

With pnpm. If you have never installed a global package with pnpm, run `pnpm setup` once and open a new shell before this command, so that pnpm has a global bin directory.

```sh
pnpm add -g @seungyeop-lee/beads-desk
```

To update, run the same install command again, then run `bd-desk restart` so that a running server switches to the new version.

To uninstall, stop the server first with `bd-desk stop`, then run `npm uninstall -g @seungyeop-lee/beads-desk` or `pnpm remove -g @seungyeop-lee/beads-desk`.

## Usage

Run `bd-desk` in a beads workspace directory or any of its subdirectories.

```sh
bd-desk start --open
```

The server starts in the background, prints its URL (`http://127.0.0.1:3000` by default), and `--open` opens that URL in your browser. The server listens only on `127.0.0.1`, so the UI is reachable only from this computer. You can close the terminal; the server keeps running.

When you are done, stop the server:

```sh
bd-desk stop
```

In a git worktree of a repository whose main checkout has `.beads`, the worktree becomes the workspace and shows the main repository's issues, as `bd` does.

### Commands

- `bd-desk start`: Starts the server. Running `bd-desk` without a command also runs `start`. If a server is already running, it does not start another one; instead, it adds the workspace of the current directory and switches to it.
- `bd-desk stop`: Stops the server. Exits with code 2 if no server is running.
- `bd-desk restart`: Restarts the server on the same port, keeping the added workspaces and the current workspace. If no server is running, it starts one for the current directory.
- `bd-desk --help` (or `-h`): Prints the usage.

### Options

- `--port <number>`: Sets the server port. If omitted, the first free port starting from 3000 is used. A running server keeps its port when you run `start` again; to change it, run `bd-desk restart --port <number>`.
- `--open`: Opens the browser once the server is ready.
- `--version` (or `-v`): Prints the installed bd-desk version.

### Working with several workspaces

Run `bd-desk start` in another beads workspace to add it to the running server. Once two or more workspaces are added, switch between them with the selector at the top right of the screen. Switching in one tab also switches every other open tab.

## Local file links in issues

Absolute-path file links and images in an issue body open when the file is in one of these directories:

- The current workspace directory
- A worktree of its git repository (a directory listed by `git worktree list`)
- `/tmp`, `/var/tmp`, or the OS temporary directory (`$TMPDIR` on macOS)

Other files show `This file is outside the allowed roots.`

The temporary directories are allowed so that files such as screenshots that agent sessions attach to their reports can be checked right away. The OS may delete files in `/tmp` and `$TMPDIR` after a few days or on reboot, while `/var/tmp` survives reboots, so do not rely on `/tmp` or `$TMPDIR` links for long-term records.

To open files in other directories, start the server with those directories in the `BEADS_DESK_LOCAL_FILE_ROOTS` environment variable:

```sh
BEADS_DESK_LOCAL_FILE_ROOTS="<directory>:<another directory>" bd-desk start
```

- Separate directories with `:`, as in `PATH`.
- Use absolute paths or paths starting with `~`. A leading `~` is expanded to your home directory even inside quotes. Relative paths are ignored.
- Only files inside the listed directories open. Symlinks are judged by the real path they point to, so a symlink inside a listed directory does not open a file outside it. Directories that do not exist are skipped.
- The value is read when the server starts. If a server is already running, `bd-desk start` only switches the workspace and ignores the new value. To change it, run `bd-desk restart` with the variable set. If you omit the variable on `restart`, the server restarts without the extra directories, so consider exporting it from your shell profile.

## File locations

The server state file (`server.json`) and log (`server.log`) are stored in `$XDG_RUNTIME_DIR/beads-desk`. If `XDG_RUNTIME_DIR` is not set, they are stored in `beads-desk` under the OS temporary directory. If the server fails to start, check `server.log`.

## Troubleshooting

- `No beads workspace found: <directory>`: Run the command in a directory that contains `.beads`, or in one of its subdirectories. For a new project, run `bd init` first.
- `Warning: the server could not run bd. Make sure bd is on PATH, or set BD_BIN to its path.`: Add `bd` to your `PATH` or set `BD_BIN`, then run `bd-desk restart` in the same shell.
- `Port <number> is already in use.`: Another program is using the port you passed to `--port`. Pass a different port, or omit `--port` to use the first free port.
- `The running server (pid <pid>) is not responding. Stop it with bd-desk stop, then start again.`: Run `bd-desk stop`, then `bd-desk start`. If it happens again, check `server.log`.

## Development

To build, test, or contribute, see [CONTRIBUTING.md](https://github.com/seungyeop-lee/beads-desk/blob/main/CONTRIBUTING.md).

To install the repository's current code as the global `bd-desk`, complete the development setup in CONTRIBUTING.md, then run `pnpm run install:global` at the repository root. It installs with `pnpm add -g`, so it needs the global bin directory that `pnpm setup` creates. To remove it, run `pnpm run uninstall:global`.

## Acknowledgements

beads-desk was inspired by [mantoni/beads-ui](https://github.com/mantoni/beads-ui) and its fork [seungyeop-lee/beads-ui](https://github.com/seungyeop-lee/beads-ui). It is a clean-room reimplementation written from scratch, not a fork of either project.

## License

[MIT](https://github.com/seungyeop-lee/beads-desk/blob/main/LICENSE)
