# Changelog

All notable changes to beads-desk are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-10-21

### Added

- Windows support. Install beads-desk with npm and run `bd-desk start`, `restart`, and `stop` on Windows. The server finds `bd` installed with npm (`npm install -g @beads/bd`) and runs its `bd.exe` directly. If the server cannot run `bd`, `bd-desk start` tells you to set `BD_BIN` to the full path of `bd.exe`. Starting beads-desk from a path that differs from the workspace path only in letter case opens the same workspace.
- Absolute-path file links and images in an issue body also open when the path starts with a Windows drive letter, such as `C:\Users\me\report.md` or `C:/tmp/a.png`. This includes reference-style links and images, and you can enter a drive path as a link address in the Markdown editor's link tool. A backslash before punctuation, as in `C:\work\.beads\a.md`, is kept when you open, copy, edit, or save the link.
- On Windows, local file links outside the workspace open from `%TEMP%`, not from `C:\tmp` or `C:\var\tmp`, and `~\` in `BEADS_DESK_LOCAL_FILE_ROOTS` means your home directory. A file whose path was replaced by a symbolic link or another file after the server checked it does not open.

## [0.6.1] - 2026-10-21

### Changed

- The top tabs are grouped in the order **Now**, **Needs human**, **Activity** | **Issues**, **Epics**, **Board** | **Decisions**, **Hygiene**, with a divider between groups.
- **Epics** screen: the **Search ID or title** field moves to the right end of the screen title row, and the space below the title row is the same as on the other list screens.

### Fixed

- The top header stays at the top of the window even when you scroll to the end of a long screen.
- **Needs human** screen: when the request you were viewing is closed and the next request is shown, the page scrolls to the top in a wide window, or to the top of the new request's panel in a narrow window, so you can tell that the request changed.
- **Epics** screen: the status chip, the progress bar or closed date, and the progress count of each card have fixed widths, and the count is split into a closed/total column and a percent column, so the columns line up across open and closed epics and across counts with different numbers of digits, also at medium widths where the actions wrap to a second line. Cards are shorter and closer together.
- **Epics** screen: in an expanded epic's child list, the **View order** link of a child epic row no longer touches the right border of the table.

## [0.6.0] - 2026-10-20

### Added

- **Epics** screen: a **Search ID or title** field. While you search, only matching epics are shown, and a collapsed group or an epic card whose child epic matches is expanded. Clearing the search restores the groups and cards you had expanded before.

### Changed

- **Epics** screen: epics are split into **Open epics** and **Closed epics** groups, and **Closed epics** is collapsed at first. A closed epic card shows the date it was closed and its closed/total child issues instead of a progress bar.
- **Epics** screen: among open epics with the same priority, the most recently created one comes first, and closed epics are listed with the most recently closed first.

### Fixed

- **Needs human** browser notifications are no longer shown for a workspace you are looking at in any focused beads-desk tab. Before, only the tab that held the connection to the server was checked, so you could be notified about the workspace on your screen.

## [0.5.0] - 2026-10-20

### Added

- **Activity** screen, next to **Needs human** in the top tabs: issues created, closed, and commented on across the workspace, newest first. Each row shows the time, the kind of record, the issue ID and title, the author, and the close reason or the start of the comment, and clicking a row opens the issue detail on top of the screen. It shows 50 records at first and 50 more each time you click **Show more**, and you can narrow it with **Dates**. Records added since your last visit are separated by a **Seen on your last visit** divider. Gate records are left out.
- **Browser notifications** in **Settings**: turn on **Notify me about new Needs human items** to get a system notification when a workspace open in a beads-desk tab gets a new **Needs human** item, even while you work in another window. Clicking the notification opens that workspace's **Needs human** screen in a new tab. No notification is shown while you are looking at that workspace in a focused tab.

### Changed

- **Issues** screen: search also finds issues by words in the design, acceptance criteria, notes, and comments, not only in the ID, title, and description. Below each matching row, the fields that matched are listed with an excerpt in which every match of the search text is bold.
- In the **Issues** and **Epics** tables, clicking the **Awaiting human** link of an issue blocked by a human gate opens the issue detail scrolled to the gate's **Response** field.

### Fixed

- When a dialog opens, the page behind it dims once, evenly over 0.3 seconds, instead of in two steps or all at once.
- **Hygiene** screen: in the wide two-column layout, each column stacks its own cards, so a long **Missing sections** list no longer pushes the **Orphaned issues** card below the first screen.
- **Issues** screen: in a narrow window of a browser whose scrollbars take up space, the horizontal scrollbar of the view tabs no longer appears between the selected tab's underline and the line below the tabs.

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
