# Changelog

All notable changes to beads-desk are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
