# Changelog

All notable changes to beads-desk are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-10-20

### Added

- Click a Mermaid diagram in an issue description, a comment, or the Markdown editor preview, or press Enter or Space on it, to enlarge it in a dialog that nearly fills the screen.
- The browser tab title of a workspace screen is `<workspace name> · beads-desk`, so you can tell tabs of different workspaces apart.

### Changed

- Every screen URL starts with `/w/<workspace name>`, and each tab shows the workspace in its own URL, so you can keep several workspaces open side by side in separate tabs. The workspace selector moves only the current tab to another workspace. A URL without a workspace name opens the same screen in the only added workspace, or asks you to choose one when several are added.
- `bd-desk start` prints the URL of the current directory's workspace, such as `http://127.0.0.1:3000/w/my-project`, whether it starts the server or adds the workspace to a running one. `bd-desk restart` keeps the added workspaces and their URLs, and prints the current directory's workspace URL if that workspace was added.
- **Blocks graph** opened from an issue detail opens on top of the detail. Closing the graph returns to the detail and side panel you were reading without loading or opening them again.
- Escape closes one step at a time: when a side panel is open in an issue detail, Escape closes only the side panel, and in a graph it closes the side panel, then the detail, then the graph. This also works when you press Escape repeatedly without clicking the page.
- **Epics** screen: epics whose parent is an epic are no longer listed as their own cards. In an expanded epic's child list, a child epic row shows a progress bar with closed/total · % of its direct child issues instead of its child count next to the title, and a **View order** link instead of the dependency counts.

### Fixed

- `webm` and `mp4` files opened from local file links play in the browser, and you can seek with the playback bar.
- The favicon is easier to see on light browser tabs: the beads are larger and have a darker outline.

## [0.3.1] - 2026-10-20

### Fixed

- Open `feature` issues can be claimed with **Claim** in the issue detail even when they have child issues, because `bd` treats a feature as work at the same level as a task. In an epic's **View order**, features with no blocks dependency are listed under **No blocks dependency**.
- `milestone` issues are treated like epics and decisions, as issues that are not worked on directly. They are no longer shown as ready or in progress, listed under **Up next** on the **Now** screen, placed on the **Board**, or listed under **Stale issues** on the **Hygiene** screen. They are left out of the **Flow** counts and durations on the **Now** screen and cannot be claimed. In an epic's **View order**, milestones and decisions are no longer listed under **No blocks dependency**.
- Decisions and other epics can be picked as a parent or child issue: in **Linked issues** in the issue detail, in the parent search of the **New issue** dialog, and in **Add an existing issue as a child** on the **Epics** screen.

## [0.3.0] - 2026-10-19

### Added

- **Issues** screen: the filter bar has a **Labels** menu. Pick one or more labels to show only issues that have any of them, or pick **No labels** to show issues without labels. The selected labels stay in the page address.

### Changed

- **Issues** and **Epics** tables: the **Assignee** column is replaced by a **Labels** column. It shows the first label as a chip and counts the rest as +N, and hovering over the cell lists every label. The `human` label is left out because the **Needs human** chip next to the title already shows it.
- Mermaid diagram previews in the Markdown editor are drawn in the current theme's colors and follow a light or dark theme switch without redrawing.
- Live updates start faster when you navigate to another page, because the server no longer re-reads the workspace's change baseline each time.

### Fixed

- Code blocks in the dark theme: syntax highlighting, the current line, selected text, the caret, matching-word and search highlights, the autocomplete list, folded code, snippet fields, and the go-to-line dialog are now readable. The go-to-line dialog's close button is drawn without a border, like the search panel's close button.
- **Needs human** screen: after you respond to or dismiss a question or human gate, including from an issue detail dialog opened on this screen, the confirmation notice appears even when the issue detail finished loading before the list.
- `bd-desk start` finds the workspace in a repository whose `.beads` directory contains only a `redirect` file, such as a repository linked to a repo hub, as long as the redirect target has a config or database file.

## [0.2.2] - 2026-10-18

### Fixed

- When an issue is blocked by a gate that is not a human gate, the blocked line on the **Now** screen, in the **Issues** and **Epics** tables, and on **Board** cards shows the gate's title instead of only its ID.

## [0.2.1] - 2026-10-18

### Fixed

- **New issue** dialog: the title field gets focus when the dialog opens, so you can start typing the title right away.

## [0.2.0] - 2026-10-18

### Added

- Click an issue ID on any screen to copy the full ID to the clipboard, not only in the issue table. This works on the Now, Needs human, Epics, Hygiene, Board, and Decisions screens, in graph cards, and in the issue detail and its dialogs. Where the whole row or card is a link or can be dragged, clicking the ID only copies it, and clicking anywhere else opens, selects, or drags the card as before.

### Changed

- **Epics** screen: an expanded epic lists its child issues in ascending ID order instead of grouping them by status. Child issues still appear right below their parent.

## [0.1.0] - 2026-10-18

The first public release of beads-desk, a local web UI for the Beads (`bd`) issue tracker.

### Added

- **Now** screen: shows what is in progress, what is up next, what is blocked, how far each open epic has come, and how many issues were created and closed over the last 7 days.
- **Needs human** screen: collects the questions (issues labeled `human`) and human gates that agents handed to a person. Respond to or dismiss them on this screen.
- **Decisions** screen: lists `decision` issues, split into active and closed decisions, with the decisions each one supersedes or is superseded by.
- **Linked issues** in the issue detail, grouped by relation (Blocked by, Blocks, Parent, Child, Related). Click one to read it in a side panel next to the current issue.
- **Graph** views: Blocks graph shows the blocks chain around an issue, and View order arranges an epic's issues into stages by their blocks dependencies.
- **Board** screen: a kanban board with Blocked, Ready, In progress, and Closed columns. Drag a card to Ready, In progress, or Closed to change its status.
- **Live updates**: changes made with `bd` in the terminal appear on every open tab within a few seconds without reloading.
- Issues, Epics, and Hygiene screens.
- English and Korean UI that follows the browser language and can be changed in Settings.
- `bd-desk` CLI with `start`, `stop`, and `restart` commands and the `--port`, `--open`, and `--version` options. Running `start` in another beads workspace adds it to the running server.
- The server listens only on `127.0.0.1` and rejects requests whose `Host` header is not `localhost`, `127.0.0.1`, or `[::1]`, to block DNS rebinding.
