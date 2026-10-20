# beads-desk

English | [한국어](https://github.com/seungyeop-lee/beads-desk/blob/main/README.ko.md)

A local web UI for [Beads](https://github.com/gastownhall/beads) (`bd`) for reviewing what your agents leave in the tracker: the plans they lay out, the decisions they record, the diagrams and screenshots they attach, and the questions they leave for you. Read and edit your issues in the browser while you and your agents keep using `bd` in the terminal.

[![beads-desk demo following one checkout epic: its plan in stages, a sequence diagram enlarged from one of its issues, a screenshot attached to the same issue, and a payment decision with the earlier decision it replaced](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/a4a2a017124b6ffa24718cbdfc8736f740c89cc9/docs/beads-desk-intro.gif)](https://seungyeop-lee.github.io/beads-desk/beads-desk-intro.mp4)

## Features

### Review the plan stage by stage

- **View order** on an epic splits its issues into stages by their `blocks` dependencies and marks the stage in progress.
- Human gates and blockers outside the epic appear in the same graph.
- **Blocks graph** shows the chain of work before and after any issue.

![View order for an epic arranging its issues into five stages, with a human gate holding the last stage](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/a4a2a017124b6ffa24718cbdfc8736f740c89cc9/docs/screenshots/graph.png)

### Read what agents attach

- Markdown and Mermaid diagrams render in descriptions and comments. Click a diagram to enlarge it.
- [Local file links](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md#local-file-links-in-issues) open in the app: images show in the issue, and `.webm` and `.mp4` recordings play.

![Issue detail showing a Mermaid sequence diagram and, below it, a screenshot of a checkout page from a local file](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/a4a2a017124b6ffa24718cbdfc8736f740c89cc9/docs/screenshots/attachments.png)

### Keep decisions on record

- `decision` issues get their own screen, split into active and closed decisions.
- Each decision links to the decisions it supersedes and the one that superseded it.

![Decisions screen splitting active and closed decisions, with supersedes and superseded-by links](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/a4a2a017124b6ffa24718cbdfc8736f740c89cc9/docs/screenshots/decisions.png)

### Answer what your agents ask

- **Needs human** collects the questions (issues labeled `human`) and human gates left for you, with the work each gate holds.
- Respond or dismiss in place. Closing a gate unblocks the work behind it.
- Turn on [browser notifications](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md#browser-notifications) to hear about new items while you work elsewhere.

![Needs human screen with a response typed for the selected gate and the task that gate blocks](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/a4a2a017124b6ffa24718cbdfc8736f740c89cc9/docs/screenshots/needs-human.png)

### See what happened while you were away

- **Activity** lists the issues created, closed, and commented on across the workspace, newest first.
- A **Seen on your last visit** divider marks where you left off.

![Activity screen listing issues created, closed, and commented on today, with a Seen on your last visit divider above older records](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/a4a2a017124b6ffa24718cbdfc8736f740c89cc9/docs/screenshots/activity.png)

### Keep the tracker tidy

- **Hygiene** finds stale issues, open issues mentioned in commits, issues missing the sections `bd` recommends, possible duplicates, and epics ready to close.
- Close a duplicate from the same screen.

![Hygiene screen with stale issues, possible duplicates, missing sections, epics ready to close, and orphaned issues](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/a4a2a017124b6ffa24718cbdfc8736f740c89cc9/docs/screenshots/hygiene.png)

### Also in beads-desk

| Screen | What it shows                                                                   |
| ------ | ------------------------------------------------------------------------------- |
| Now    | What is in progress, up next, and blocked, with epic progress and a 7-day chart |
| Issues | All issues by work state, with filters and search through bodies and comments   |
| Epics  | Open and closed epics with their progress, searchable by ID or title            |
| Board  | Cards you drag to change status                                                 |

- A side panel opens a linked issue beside the one you are reading.
- Every read and change goes through the `bd` CLI, and changes made with `bd` show up in open tabs within seconds.
- Each tab can show a different workspace.
- English and Korean UI, light and dark themes, set in **Settings**.

![Now screen showing counts of in-progress, ready, blocked, and needs-human issues, a 7-day created and closed chart, and the in-progress and blocked lists](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/a4a2a017124b6ffa24718cbdfc8736f740c89cc9/docs/screenshots/now.png)

## Requirements

- macOS or Linux. Tested on macOS with `bd` 1.3.1. Windows is not supported.
- Node.js 22 or later
- The `bd` CLI. If `bd` is not on your `PATH`, set the `BD_BIN` environment variable to the path of the executable when you start the server.
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
