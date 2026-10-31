# beads-desk

English | [한국어](https://github.com/seungyeop-lee/beads-desk/blob/main/README.ko.md)

A local web UI for [Beads](https://github.com/gastownhall/beads) (`bd`) for reviewing what your agents leave in the tracker: the plans they lay out, the decisions they record, the diagrams and screenshots they attach, and the questions they leave for you. Read and edit your issues in the browser while you and your agents keep using `bd` in the terminal.

[![beads-desk demo starting at the top of the Now screen and moving down to its due dates and bottlenecks, then opening an issue due today: its blocks graph, a sequence diagram enlarged from the checkout issue it waits on, a screenshot attached to that issue, and a payment decision with the earlier decision it replaced](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/2f2042aeb264d5b5895d3dd01032f0616a465589/docs/beads-desk-intro.gif)](https://seungyeop-lee.github.io/beads-desk/beads-desk-intro.mp4)

## Features

### See what to unblock next

- **Now** lists open issues with a due date in three groups: **Overdue**, **Due today**, and the next 3 days. Set or clear an issue's due date in its details.
- **Bottlenecks** lists the issues that block other issues, sorted by how many issues wait on them. Each entry shows the waiting issues that have a due date and how many issues become ready once it is closed.
- The full list is in the **Bottlenecks** view of the **Issues** screen.
- The same screen also counts in-progress, ready, and blocked issues, charts the last 7 days, and shows epic progress.

![Now screen with due dates grouped into overdue, due today, and the next 3 days, bottlenecks sorted by how many issues wait on them, and epic progress bars](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/2f2042aeb264d5b5895d3dd01032f0616a465589/docs/screenshots/now.png)

### Review the plan stage by stage

- **View order** on an epic splits its issues into stages by their `blocks` dependencies and marks the stage in progress.
- Human gates and blockers outside the epic appear in the same graph.
- **Blocks graph** shows the chain of work before and after any issue.

![View order for an epic arranging its issues into five stages, with a human gate holding the last stage](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/2f2042aeb264d5b5895d3dd01032f0616a465589/docs/screenshots/graph.png)

### Read what agents attach

- Markdown and Mermaid diagrams render in descriptions and comments. Click a diagram to enlarge it.
- [Local file links](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md#local-file-links-in-issues) open in the app: images show in the issue, and `.webm` and `.mp4` recordings play.
- Links to `.diff`, `.patch`, `.md`, `.log`, and `.txt` files expand below the paragraph, so you can read them without leaving the issue. Diffs show line numbers and highlight the changed words; Markdown files show their source with syntax highlighting.

![Issue detail showing a Mermaid sequence diagram, a screenshot of a checkout page from a local file, and expanded previews of a Markdown note with syntax highlighting and of a diff with line numbers and the changed words highlighted](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/2f2042aeb264d5b5895d3dd01032f0616a465589/docs/screenshots/attachments.png)

### Keep decisions on record

- `decision` issues get their own screen, split into active and closed decisions.
- Each decision links to the decisions it supersedes and the one that superseded it.

![Decisions screen splitting active and closed decisions, with supersedes and superseded-by links](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/2f2042aeb264d5b5895d3dd01032f0616a465589/docs/screenshots/decisions.png)

### Answer what your agents ask

- **Needs human** collects the questions (issues labeled `human`) and human gates left for you, with the work each gate holds.
- Respond or dismiss in place. Closing a gate unblocks the work behind it.
- Turn on [browser notifications](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md#browser-notifications) to hear about new items while you work elsewhere.

![Needs human screen with a response typed for the selected gate and the task that gate blocks](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/2f2042aeb264d5b5895d3dd01032f0616a465589/docs/screenshots/needs-human.png)

### See what happened while you were away

- **Activity** lists the issues created, closed, and commented on across the workspace, newest first.
- Issue edits (description, status, title, labels, and more) and deletions appear once you turn on bd's events journal with `bd config set events-journal true`. Only changes made after that are recorded.
- A **Seen on your last visit** divider marks where you left off.

![Activity screen listing issues created, closed, and commented on today, with a Seen on your last visit divider above older records](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/2f2042aeb264d5b5895d3dd01032f0616a465589/docs/screenshots/activity.png)

### Keep the tracker tidy

- **Hygiene** finds stale issues, open issues mentioned in commits, issues missing the sections `bd` recommends, possible duplicates, and epics ready to close.
- Close a duplicate from the same screen.

![Hygiene screen with stale issues, possible duplicates, missing sections, epics ready to close, and orphaned issues](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/2f2042aeb264d5b5895d3dd01032f0616a465589/docs/screenshots/hygiene.png)

### Also in beads-desk

| Screen | What it shows                                                                 |
| ------ | ----------------------------------------------------------------------------- |
| Issues | All issues by work state, with filters and search through bodies and comments |
| Epics  | Open and closed epics with their progress, searchable by ID or title          |
| Board  | Cards you drag to change status                                               |

- A side panel opens a linked issue beside the one you are reading.
- Every read and change goes through the `bd` CLI, and changes made with `bd` show up in open tabs within seconds.
- Each tab can show a different workspace.
- English and Korean UI, light and dark themes, set in **Settings**.

## Requirements

- macOS, Linux, or Windows. Tested with `bd` 1.3.1 on macOS and on the GitHub Actions `windows-latest` runner. The Windows tests install beads-desk with npm and use a workspace in embedded mode.
- Node.js 22 or later
- The `bd` CLI. If `bd` is not on your `PATH`, set the `BD_BIN` environment variable to the path of the executable when you start the server.
  - On Windows, `bd` installed with npm (`npm install -g @beads/bd`) is found automatically. If you installed `bd` another way and the server cannot find it, set `BD_BIN` to the full path of `bd.exe`, as shown in [Troubleshooting](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md#troubleshooting).
- A beads workspace: a directory where you ran `bd init`

## Getting started

1. Install with npm:

   ```sh
   npm install -g @seungyeop-lee/beads-desk
   ```

   Or with pnpm. If you have never installed a global package with pnpm, run `pnpm setup` once and open a new shell first.

   ```sh
   pnpm add -g @seungyeop-lee/beads-desk
   ```

2. In a beads workspace directory or any of its subdirectories, start the server:

   ```sh
   bd-desk start --open
   ```

   The server runs in the background, opens the UI in your browser, and listens only on `127.0.0.1`, so only this computer can reach it.

- **Stop:** run `bd-desk stop`.
- **Update:** run the install command again, then `bd-desk restart`. The [changelog](https://github.com/seungyeop-lee/beads-desk/blob/main/CHANGELOG.md) lists what changed.
- **More:** the [usage guide](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md) covers commands, options, multiple workspaces, notifications, local file links, uninstalling, and troubleshooting.

## Contributing

Bug reports and feature ideas are welcome as GitHub issues; pull requests are not accepted. See [CONTRIBUTING.md](https://github.com/seungyeop-lee/beads-desk/blob/main/CONTRIBUTING.md).

## Acknowledgements

beads-desk was inspired by [mantoni/beads-ui](https://github.com/mantoni/beads-ui).

## License

[MIT](https://github.com/seungyeop-lee/beads-desk/blob/main/LICENSE)
