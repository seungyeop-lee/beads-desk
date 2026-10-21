# beads-desk usage guide

English | [한국어](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ko.md)

This guide assumes you have installed beads-desk as described in the [README](https://github.com/seungyeop-lee/beads-desk/blob/main/README.md#getting-started).

## Commands

Run `bd-desk` in a beads workspace directory or any of its subdirectories.

- `bd-desk start`: Starts the server in the background and prints the URL of the current directory's workspace, such as `http://127.0.0.1:3000/w/my-project`. You can close the terminal; the server keeps running. Running `bd-desk` without a command also runs `start`. If a server is already running, it does not start another one; instead, it adds the workspace of the current directory and prints its URL.
- `bd-desk stop`: Stops the server. Exits with code 2 if no server is running.
- `bd-desk restart`: Restarts the server on the same port, keeping the added workspaces and their URLs. It prints the URL of the current directory's workspace if that workspace was added, and the server URL otherwise. If no server is running, it starts one for the current directory.
- `bd-desk --help` (or `-h`): Prints the usage.

In a git worktree of a repository whose main checkout has `.beads`, the worktree becomes the workspace and shows the main repository's issues, as `bd` does.

## Options

- `--port <number>`: Sets the server port. If omitted, the first free port starting from 3000 is used. A running server keeps its port when you run `start` again; to change it, run `bd-desk restart --port <number>`.
- `--open`: Opens the browser once the server is ready.
- `--version` (or `-v`): Prints the installed bd-desk version.

## Working with several workspaces

Every screen URL starts with `/w/<workspace name>`, so the address bar shows which workspace you are looking at. The workspace name is the directory name, with spaces and characters that cannot appear in a URL replaced by `_`. If two added workspaces have the same directory name, the one added later gets `-2`, `-3`, and so on.

Run `bd-desk start` in another beads workspace to add it to the running server and print its URL. Each tab shows the workspace in its own URL, so you can keep several workspaces open side by side in separate tabs or windows. The selector at the top right of the screen moves only the current tab to another workspace.

A URL without a workspace name, such as `http://127.0.0.1:3000/issues`, opens the same screen in the only added workspace. If several workspaces are added, it asks you to choose one.

## How changes made with `bd` appear

While a tab is open, the server checks whether the workspace's database has changed and, when it has, tells the open tabs to read their data again. Changes made with `bd` in the terminal, by you or an agent, therefore appear within a few seconds without reloading. In embedded mode the server compares the Dolt database's `.dolt/noms/manifest` file, and in server mode it compares the database hash from `bd sql` (`DOLT_HASHOF_DB()`).

## Browser notifications

To be notified when your agents leave something for you, open Settings and turn on **Notify me about new Needs human items**. The browser asks for permission the first time. If the browser blocks notifications for the site, the switch cannot be turned on until you allow them in the site settings next to the address bar.

- A notification appears when a workspace open in a beads-desk tab gets a new Needs human item. Items that were already there when you turned notifications on or opened the tab are not announced.
- With several tabs open, each new item is announced once, not once per tab.
- No notification is shown while you are looking at that workspace in a focused tab.
- Clicking the notification opens that workspace's Needs human screen in a new tab.
- The setting and the permission belong to the server's address. If the server starts on a different port, turn notifications on again.

## Local file links in issues

Absolute-path file links and images in an issue body open when the file is in one of these directories:

- The directory of the workspace in the tab's URL
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
- The value is read when the server starts. If a server is already running, `bd-desk start` only adds the workspace and ignores the new value. To change it, run `bd-desk restart` with the variable set. If you omit the variable on `restart`, the server restarts without the extra directories, so consider exporting it from your shell profile.

An opened file is shown according to its extension:

- `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`: shown as an image.
- `.webm`, `.mp4`: played as a video.
- Any other extension, including HTML, SVG, and script files: shown as plain text so that the file does not run in the app's origin.

## Updating and uninstalling

To update, run the install command again, then run `bd-desk restart` so that a running server switches to the new version.

To uninstall, stop the server first with `bd-desk stop`, then run `npm uninstall -g @seungyeop-lee/beads-desk` or `pnpm remove -g @seungyeop-lee/beads-desk`.

## File locations

The server state file (`server.json`) and log (`server.log`) are stored in `$XDG_RUNTIME_DIR/beads-desk`. If `XDG_RUNTIME_DIR` is not set, they are stored in `beads-desk` under the OS temporary directory.

## Troubleshooting

If the server fails to start, check `server.log` (see [File locations](#file-locations)).

- `No beads workspace found: <directory>`: Run the command in a directory that contains `.beads`, or in one of its subdirectories. For a new project, run `bd init` first.
- `Warning: the server could not run bd. Make sure bd is on PATH, or set BD_BIN to its path.` (macOS, Linux): Add `bd` to your `PATH` or set `BD_BIN`, then run `bd-desk restart` in the same shell.
- `Warning: the server could not run bd. Make sure bd.exe is on PATH, or set BD_BIN to the full path of bd.exe.` (Windows): Add the directory that contains `bd.exe` to your `PATH`, or set `BD_BIN` to the full path of `bd.exe`, then run `bd-desk restart` in the same shell. If you installed bd with pnpm or volta, set `BD_BIN` to `bd.exe`, not to the `bd.cmd` shim.
- `Port <number> is already in use.`: Another program is using the port you passed to `--port`. Pass a different port, or omit `--port` to use the first free port.
- `The running server (pid <pid>) is not responding. Stop it with bd-desk stop, then start again.`: Run `bd-desk stop`, then `bd-desk start`. If it happens again, check `server.log`.
