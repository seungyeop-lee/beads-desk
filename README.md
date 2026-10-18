# beads-desk

English | [한국어](https://github.com/seungyeop-lee/beads-desk/blob/main/README.ko.md)

A local web UI for the [Beads](https://github.com/gastownhall/beads) (`bd`) issue tracker. Read and edit your issues in the browser while you and your agents keep using `bd` in the terminal.

[![beads-desk demo: answering a human gate in Needs human unblocks the work it held back, followed by the Now, Graph, Decisions, and Board screens](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/6dd972f29742ee8ea5d0d91ceb0245062718e0ab/docs/beads-desk-intro.gif)](https://github.com/seungyeop-lee/beads-desk/releases/download/v0.1.0/beads-desk-intro.mp4)

## Features

### See what to do now

- **Now**: The start page shows what is in progress, up next, and blocked, along with each open epic's progress and the issues created and closed over the last 7 days.

  ![Now screen showing counts of in-progress, ready, blocked, and needs-human issues, a 7-day created and closed chart, and the in-progress and blocked lists](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/f01c0ef35da18cff8eab618a3bc0999d5e40f643/docs/screenshots/now.png)

- **Needs human**: Collects the questions (issues labeled `human`) and human gates your agents leave for a person. Respond or dismiss them here; a response is saved as a comment, and closing a gate unblocks the issues waiting on it.

  ![Needs human screen listing two human gates and one question, with a response form for the selected gate](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/3fd01240cdbd8061fa15122d40a9f0c65bd833bd/docs/screenshots/needs-human.png)

- **Decisions**: Lists `decision` issues on their own screen, split into active and closed, with the decisions each one supersedes or is superseded by.

  ![Decisions screen splitting active and closed decisions, with supersedes and superseded-by links](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/f01c0ef35da18cff8eab618a3bc0999d5e40f643/docs/screenshots/decisions.png)

### See how work connects

- **Linked issues**: An issue's detail lists its Blocked by, Blocks, Parent, Child, and Related issues. Click one to read it in a side panel.

  ![Issue detail with a linked issue open in a side panel that lists its parent, blocked-by, and blocks issues](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/3fd01240cdbd8061fa15122d40a9f0c65bd833bd/docs/screenshots/linked-issues.png)

- **Graph**: From an issue, Blocks graph lays out the blocks chain around it, with prerequisites on the left and dependent work on the right. On an epic, View order arranges its issues into stages by their blocks dependencies; issues in the same stage can proceed in parallel.

  ![View order for an epic arranging its issues into five stages by their blocks dependencies](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/3fd01240cdbd8061fa15122d40a9f0c65bd833bd/docs/screenshots/graph.png)

### Manage the flow

- **Board**: A kanban board with Blocked, Ready, In progress, and Closed columns. Drag a card to Ready, In progress, or Closed to change its status.

  ![Board with Blocked, Ready, In progress, and Closed columns of issue cards](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/3fd01240cdbd8061fa15122d40a9f0c65bd833bd/docs/screenshots/board.png)

### Work alongside the CLI

- **Live updates**: Changes made with `bd` in the terminal, by you or an agent, appear in every open tab within a few seconds, without reloading.

There are also Issues, Epics, and Hygiene screens. The UI is in English and Korean and follows your browser's language. To change the language or theme, open Settings with the button to the left of New issue at the top right.

## Requirements

- macOS or Linux. Tested on macOS with `bd` 1.3.1. Windows is not supported.
- Node.js 22 or later
- The `bd` CLI. If `bd` is not on your `PATH`, set the `BD_BIN` environment variable to the path of the executable when you start the server.
- A beads workspace: a directory where you ran `bd init`

## Getting started

Install with npm:

```sh
npm install -g @seungyeop-lee/beads-desk
```

Or with pnpm. If you have never installed a global package with pnpm, run `pnpm setup` once and open a new shell first.

```sh
pnpm add -g @seungyeop-lee/beads-desk
```

In a beads workspace directory or any of its subdirectories, start the server:

```sh
bd-desk start --open
```

The server runs in the background and opens the UI in your browser. It listens only on `127.0.0.1`, so the UI is reachable only from this computer. To stop it, run `bd-desk stop`.

To update to the latest version, run the install command again, then run `bd-desk restart` so that a running server switches to the new version. The [changelog](https://github.com/seungyeop-lee/beads-desk/blob/main/CHANGELOG.md) lists what changed in each version.

The [usage guide](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md) covers commands and options, multiple workspaces, local file links in issues, uninstalling, and troubleshooting.

## Contributing

Bug reports and feature ideas are welcome as GitHub issues; pull requests are not accepted. See [CONTRIBUTING.md](https://github.com/seungyeop-lee/beads-desk/blob/main/CONTRIBUTING.md).

## Acknowledgements

beads-desk was inspired by [mantoni/beads-ui](https://github.com/mantoni/beads-ui).

## License

[MIT](https://github.com/seungyeop-lee/beads-desk/blob/main/LICENSE)
