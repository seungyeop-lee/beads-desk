# beads-desk usage guide

🇺🇸 English | 🇰🇷 [한국어](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ko.md) | 🇯🇵 [日本語](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ja.md)

This guide assumes you have installed beads-desk as described in the [README](https://github.com/seungyeop-lee/beads-desk/blob/main/README.md#getting-started).

## Commands

Run `bd-desk` in a beads workspace directory or any of its subdirectories.

- `bd-desk start`: Starts the server in the background and prints the URL of the current directory's workspace, such as `http://127.0.0.1:3000/w/my-project`.
  - You can close the terminal; the server keeps running.
  - Running `bd-desk` without a command also runs `start`.
  - If a server is already running, it does not start another one; instead, it adds the workspace of the current directory and prints its URL.
- `bd-desk stop`: Stops the server. Exits with code 2 if no server is running.
- `bd-desk restart`: Restarts the server on the same port, keeping the added workspaces and their URLs.
  - It prints the URL of the current directory's workspace if that workspace was added, and the server URL otherwise.
  - If no server is running, it starts one for the current directory.
- `bd-desk --help` (or `-h`): Prints the usage.

### Dolt server in server mode

If the workspace is configured to use a Dolt server (server mode):

- `bd-desk stop` stops only the beads-desk server, and the Dolt server that bd started keeps running.
- bd starts the Dolt server as a separate background process so that it outlives the bd command that started it.
- To stop the Dolt server, run `bd dolt stop` in the workspace directory.
- Stop the Dolt server before you delete or move the workspace.
- In shared-server mode, all beads projects on the machine share one Dolt server, so `bd dolt stop` stops it for the other projects too.

### Running in a git worktree

In a git worktree of a repository whose main checkout has `.beads`, the worktree becomes the workspace and shows the main repository's issues, as `bd` does.

## Options

- `--port <number>`: Sets the server port. If omitted, the first free port starting from 3000 is used. A running server keeps its port when you run `start` again; to change it, run `bd-desk restart --port <number>`.
- `--open`: Opens the browser once the server is ready.
- `--version` (or `-v`): Prints the installed bd-desk version.

## Working with several workspaces

### Workspace names in URLs

- Every screen URL starts with `/w/<workspace name>`, so the address bar shows which workspace you are looking at.
- The workspace name is the directory name, with spaces and characters that cannot appear in a URL replaced by `_`.
- If two added workspaces have the same directory name, the one added later gets `-2`, `-3`, and so on.

### Adding a workspace

- Run `bd-desk start` in another beads workspace to add it to the running server and print its URL.
- Each tab shows the workspace in its own URL, so you can keep several workspaces open side by side in separate tabs or windows.
- The selector at the top right of the screen moves only the current tab to another workspace.

### URLs without a workspace name

- A URL without a workspace name, such as `http://127.0.0.1:3000/issues`, opens the same screen in the only added workspace.
- If several workspaces are added, it asks you to choose one.

## How changes made with `bd` appear

- While a tab is open, the server checks whether the workspace's database has changed and, when it has, tells the open tabs to read their data again.
- Changes made with `bd` in the terminal, by you or an agent, therefore appear within a few seconds without reloading.
- In embedded mode, the server detects a change by comparing the Dolt database's `.dolt/noms/manifest` file.
- In server mode, it compares the database hash from `bd sql` (`DOLT_HASHOF_DB()`).

## Browser notifications

### Turning on notifications

- To be notified when your agents leave something for you, open Settings and turn on **Notify me about new Needs human items**.
- The browser asks for permission the first time.
- If the browser blocks notifications for the site, the switch cannot be turned on until you allow them in the site settings next to the address bar.
- The setting and the permission belong to the server's address. If the server starts on a different port, turn notifications on again.

### When a notification appears

- A notification appears when a workspace open in a beads-desk tab gets a new Needs human item.
- Items that were already there when you turned notifications on or opened the tab are not announced.
- With several tabs open, each new item is announced once, not once per tab.
- No notification is shown while you are looking at that workspace in a focused tab.
- Clicking the notification opens that workspace's Needs human screen in a new tab.

## Local file links in issues

Absolute-path file links and images in an issue body open in the app. On Windows, paths with a drive letter, such as `C:\Users\me\report.md` and `C:/Users/me/report.md`, work too.

### Allowed directories

A file opens only when it is in one of these directories:

- The directory of the workspace in the tab's URL
- A worktree of its git repository (a directory listed by `git worktree list`)
- The OS temporary directory (`$TMPDIR` on macOS, `%TEMP%` on Windows)
- `/tmp` and `/var/tmp`, on macOS and Linux only
- `~/.beads-starter` in the home directory of the user running the server, including all subdirectories

Other files show `This file is outside the allowed roots.`

### Temporary directories

- The temporary directories are allowed so that files such as screenshots that agent sessions attach to their reports can be checked right away.
- The OS may delete files in `/tmp` and `$TMPDIR` after a few days or on reboot, so do not rely on `/tmp` or `$TMPDIR` links for long-term records.
- Files in `/var/tmp` survive reboots.

### Allowing other directories

To open files in other directories, start the server with those directories in the `BEADS_DESK_LOCAL_FILE_ROOTS` environment variable:

```sh
BEADS_DESK_LOCAL_FILE_ROOTS="<directory>:<another directory>" bd-desk start
```

In PowerShell on Windows:

```powershell
$env:BEADS_DESK_LOCAL_FILE_ROOTS = "<directory>;<another directory>"
bd-desk start
```

- Separate directories with `:`, as in `PATH`. On Windows, separate them with `;`.
- Use absolute paths or paths starting with `~`. A leading `~` is expanded to your home directory even inside quotes; on Windows, `~\` works as well as `~/`. Relative paths are ignored.
- Only files inside the listed directories open. Symlinks are judged by the real path they point to, so a symlink inside a listed directory does not open a file outside it. Directories that do not exist are skipped.
- The value is read when the server starts.
  - If a server is already running, `bd-desk start` only adds the workspace and ignores the new value.
  - To change the value, run `bd-desk restart` with the variable set.
  - If you omit the variable on `restart`, the server restarts without the extra directories, so consider setting it in your shell profile.

### How files are shown

An opened file is shown according to its extension:

- `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`: shown as an image.
- `.webm`, `.mp4`: played as a video.
- Any other extension, including HTML, SVG, and script files: shown as plain text so that the file does not run in the app's origin.

### Folder page

- Opening: A link to a folder in the allowed directories opens a folder page in the app, whether or not the path ends with `/`.
- Listed items:
  - The page lists the folder's items with their names, sizes, and modified times.
  - Items whose names start with `.` are neither listed nor counted.
  - A symlink that points outside the allowed directories is listed without a link and marked `Cannot open`.
- Order and count:
  - Folders come first, and folders and files are each sorted newest first.
  - The total number of items appears next to the folder name.
  - The first 200 items are shown, and **Show more** loads the next 200.
- Navigation:
  - Clicking a file opens it in a new tab, and clicking a subfolder opens it on the same page.
  - The path bar above the list starts at the linked folder and has no links to the folders above it.
- Updates: The list is read when the page opens and does not update by itself, so reload the page to see later changes.

### Diff page

- Opening:
  - Clicking a link to a `.diff` or `.patch` file in the allowed directories, in an issue or on a folder page, opens the file on the app's diff page in a new tab instead of as raw text.
  - You can also open the page directly at `/w/<workspace name>/diff?path=<absolute path of the file>`.
- File tree:
  - The left side lists the changed files as a tree, like the **Files changed** tree of a GitHub pull request.
  - A folder whose only item is one subfolder is merged with it into one row such as `src/checkout`.
  - Within a folder, folders come first and names are sorted alphabetically.
  - Click a folder to collapse or expand it, and click a file to scroll the diff on the right to that file.
  - In narrow windows the file tree is hidden at first.
- Commit message: For a file made with `git format-patch`, the commit subject appears above the tree; click it to show the rest of the message and the signature.
- Line wrapping:
  - Long lines wrap by default, and each line created by wrapping is marked with ↪.
  - The line wrapping choice is kept for the next time you open a diff page in the same browser.
- Buttons: The buttons at the top right show or hide the file tree, turn line wrapping on or off, and download the original file under its own name.
- Files that are not diffs: A file that cannot be read as a file diff is shown as text with added and removed lines colored.
- Large files: Files larger than 5 MB are not drawn: a message is shown instead, and the download button still works.
- Updates: The file is read when the page opens and does not update by itself.

### Text page

- Opening:
  - Clicking a link to a `.md`, `.markdown`, `.txt`, or `.log` file in the allowed directories, in an issue or on a folder page, opens the file on the app's text page in a new tab instead of as raw text.
  - You can also open the page directly at `/w/<workspace name>/text?path=<absolute path of the file>`.
- Display:
  - `.md` and `.markdown` files are rendered as Markdown.
  - `.txt` and `.log` files are shown as they are.
- Relative links: Relative links and images in a rendered Markdown file, such as `![](img/a.png)` or `[Next](../README.md)`, are resolved from the folder that holds the file and open like other local file links.
- Raw file: **Open raw file** at the top right opens the original file in a new tab.
- Large files: Files larger than 5 MB are not drawn: a message is shown instead, and **Open raw file** still works.
- Updates: The file is read when the page opens and does not update by itself.

### Where links open

- Links to local files and to external addresses such as `https://` open in a new tab, so the issue you were viewing stays open.
- Links to app screens such as `/epics` open in the current tab.

### Expanding files in an issue

- Chevron button:
  - Links to `.diff`, `.patch`, `.md`, `.markdown`, `.log`, and `.txt` files have a chevron button right after the file name.
  - The chevron button appears only while the body is not being edited; while editing, these links look like ordinary links.
- Clicking the link: The link opens the file in a new tab like other local file links: `.diff` and `.patch` files on the diff page, and the others on the text page.
- Expanding:
  - Clicking the chevron button, or pressing Enter or Space while it has focus, shows the file contents right below the paragraph or list item that holds the link, without leaving the issue.
  - Doing it again collapses them.
  - While the contents are shown, the chevron points down.
  - Long contents scroll inside the expanded box.
- Diff files:
  - `.diff` and `.patch` files are shown as a diff view.
  - Each file gets a header with its path, a badge such as `new file` or `renamed`, and its added and removed line counts.
  - Each line shows its old and new line numbers.
  - Added and removed lines are shaded, and the changed words within a changed line are highlighted.
  - A `.diff` or `.patch` file that cannot be read as a file diff is shown as text with added and removed lines colored.
- Text files:
  - `.md` and `.markdown` files are shown as Markdown source (not rendered) with headings, emphasis, links, list markers, and code highlighted, including code blocks in their own language.
  - `.log` and `.txt` files are shown as they are.
- Large files: Files larger than 1 MB are not loaded; a message and a link that opens the file in a new tab, on the same page as the file link, are shown instead.

## Updating and uninstalling

To update, run the install command again, then run `bd-desk restart` so that a running server switches to the new version.

To uninstall, stop the server first with `bd-desk stop`, then run `npm uninstall -g @seungyeop-lee/beads-desk` or `pnpm remove -g @seungyeop-lee/beads-desk`.

## File locations

The server state file (`server.json`) and log (`server.log`) are stored in `$XDG_RUNTIME_DIR/beads-desk`. If `XDG_RUNTIME_DIR` is not set, they are stored in `beads-desk` under the OS temporary directory, which is `%TEMP%\beads-desk` on Windows.

## Troubleshooting

If the server fails to start, check `server.log` (see [File locations](#file-locations)).

- `No beads workspace found: <directory>`: Run the command in a directory that contains `.beads`, or in one of its subdirectories. For a new project, run `bd init` first.
- `Warning: the server could not run bd. Make sure bd is on PATH, or set BD_BIN to its path.` (macOS, Linux): Add `bd` to your `PATH` or set `BD_BIN`, then run `bd-desk restart` in the same shell.
- `Warning: the server could not run bd. Make sure bd.exe is on PATH, or set BD_BIN to the full path of bd.exe.` (Windows):
  - Add the directory that contains `bd.exe` to your `PATH`, or set `BD_BIN` to the full path of `bd.exe`, then run `bd-desk restart` in the same shell.
  - If you installed bd with pnpm or volta, set `BD_BIN` to `bd.exe`, not to the `bd.cmd` shim.
  - In PowerShell:

    ```powershell
    $env:BD_BIN = "<full path of bd.exe>"
    bd-desk restart
    ```

- `Port <number> is already in use.`: Another program is using the port you passed to `--port`. Pass a different port, or omit `--port` to use the first free port.
- `The running server (pid <pid>) is not responding. Stop it with bd-desk stop, then start again.`: Run `bd-desk stop`, then `bd-desk start`. If it happens again, check `server.log`.
