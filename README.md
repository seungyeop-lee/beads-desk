# beads-desk

English | [한국어](https://github.com/seungyeop-lee/beads-desk/blob/main/README.ko.md)

A local web UI for [Beads](https://github.com/gastownhall/beads) (`bd`) for reviewing what your agents leave in the tracker: the plans they lay out, the decisions they record, the diagrams and screenshots they attach, and the questions they leave for you. Read and edit your issues in the browser while you and your agents keep using `bd` in the terminal.

[![beads-desk demo: an epic's stages, an issue with a sequence diagram, a screenshot, and a screen recording attached, a decision and the one it replaced, and a human gate answered so the work it held moves to Ready](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/beads-desk-intro.gif)](https://seungyeop-lee.github.io/beads-desk/beads-desk-intro.mp4)

## Features

### Review the plan stage by stage

On an epic, View order arranges its issues into stages by their `blocks` dependencies and shows which stage is in progress. Human gates and blockers outside the epic appear in the same graph, and issues in the same stage can proceed in parallel. Click an issue to read it beside the graph.

From any issue, Blocks graph lays out the chain of work before and after it, and every issue shows how many others are waiting on it.

![View order for an epic arranging its issues into five stages, with a human gate holding the last stage](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/graph.png)

### Read what agents attach

Issue descriptions and comments render Markdown, including Mermaid diagrams; click a diagram to see it full size. Links to local files with absolute paths open in the app: images are shown in the issue, and `.webm` and `.mp4` recordings play. See [Local file links in issues](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md#local-file-links-in-issues) for which directories can be opened.

![Issue detail showing a Mermaid sequence diagram and, below it, a screenshot of a checkout page from a local file](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/attachments.png)

### Keep decisions on record

`decision` issues get their own screen, split into active and closed decisions. Each decision links to the decisions it supersedes and the one that superseded it, so you can follow why an earlier choice was replaced.

![Decisions screen splitting active and closed decisions, with supersedes and superseded-by links](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/decisions.png)

### Answer what your agents ask

Needs human collects the questions (issues labeled `human`) and human gates your agents leave for a person, with the work each gate holds. Respond or dismiss them here; a response is saved as a comment, and closing a gate unblocks the issues waiting on it.

![Needs human screen with a response typed for the selected gate and the task that gate blocks](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/needs-human.png)

### Keep the tracker tidy

Hygiene lists stale issues, open issues whose ID appears in a commit message, issues missing the sections `bd` recommends for their type, possible duplicates, and epics whose children are all closed. Close one issue of a duplicate pair as a duplicate of the other from the same screen.

![Hygiene screen with stale issues, possible duplicates, missing sections, epics ready to close, and orphaned issues](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/hygiene.png)

### Also in beads-desk

Now, the start page, shows what is in progress, up next, and blocked, with each open epic's progress and the issues created and closed over the last 7 days. There are also a Board where you drag cards to change their status, Issues and Epics screens, and a side panel for reading a linked issue without leaving the one you are on. Changes made with `bd` appear in every open tab within a few seconds, and issues are read and changed only through the `bd` CLI. Each tab can show a different workspace. The UI is in English and Korean and follows your browser's language; to change the language or theme, open Settings with the button to the left of New issue at the top right.

![Now screen showing counts of in-progress, ready, blocked, and needs-human issues, a 7-day created and closed chart, and the in-progress and blocked lists](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/now.png)

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
