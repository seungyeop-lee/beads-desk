import type { SiteContent } from "./types";

export const enContent: SiteContent = {
  locale: "en",
  localeLabel: "English",
  skipToContent: "Skip to main content",
  nav: {
    primaryLabel: "Primary navigation",
    languageLabel: "Language selector",
    features: "Features",
    requirements: "Requirements",
    install: "Get started",
    github: "GitHub",
    npm: "npm",
  },
  hero: {
    eyebrow: "Local-first Web UI for Beads (bd)",
    headline: "Review what your coding agents leave in Beads.",
    subtitle:
      "Inspect plans, decisions, Mermaid diagrams, screenshots, diffs, and human questions in your browser while you and your agents keep using bd in the terminal.",
    primaryCta: "Get started",
    secondaryCta: "View on GitHub",
    quickStartTitle: "Quick start in any Beads workspace",
    installLabel: "Install globally with npm",
    startLabel: "Start local server and open browser",
    videoCaption:
      "Walkthrough of the Now screen, due dates, bottlenecks, an issue blocks graph, an enlarged Mermaid sequence diagram, an attached screenshot, and superseded decisions.",
    videoLabel: "beads-desk product walkthrough video (no audio)",
    videoPauseLabel: "Pause",
    videoPlayLabel: "Play",
    videoPauseAriaLabel: "Pause product walkthrough video",
    videoPlayAriaLabel: "Play product walkthrough video",
  },
  copy: {
    buttonPrefix: "Copy command:",
    copied: "Copied",
    failed: "Copy failed",
  },
  featuresSection: {
    eyebrow: "Core Features",
    title: "Built for reviewing agent work without leaving bd",
    subtitle:
      "Every read and edit goes through the bd CLI, and changes made in the terminal appear in open tabs within seconds.",
    enlargeLabel: "Enlarge screenshot",
    closeDialogLabel: "Close preview",
    items: [
      {
        id: "issues",
        badge: "Issues",
        tone: "azure",
        title: "Browse every issue by work state",
        summary:
          "Group issues into In progress, Ready, Blocked, Deferred, and Closed tabs, or switch straight to Bottlenecks.",
        bullets: [
          "Filter by type, label, created or closed date, or No epic only, with direct links to each issue's epic.",
          "Search across IDs, titles, descriptions, and comments with inline match locations.",
          "Change status and priority directly from the list.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/issues.png",
            alt: "Issues screen grouping all issues by work state, with view tabs, filters, type tags, status and priority chips, and epic links",
            width: 2880,
            height: 1800,
            caption: "Issues screen with work-state tabs, filters, and inline status controls",
          },
        ],
      },
      {
        id: "now-bottlenecks",
        badge: "Now & Bottlenecks",
        tone: "sand",
        title: "See what is due and what to unblock next",
        summary:
          "Focus on urgent due dates in Now and rank blocking issues by downstream impact in Bottlenecks.",
        bullets: [
          "Now groups open issues with due dates into Overdue, Due today, and the next 3 days.",
          "Bottlenecks sorts blockers by how many issues wait on them, showing due dates at risk and how many issues become ready upon close.",
          "Track in-progress, ready, and blocked counts, a 7-day flow chart, and epic progress bars in one view.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/now.png",
            alt: "Now screen with due dates grouped into overdue, due today, and the next 3 days, bottlenecks sorted by waiting issues, and epic progress bars",
            width: 2880,
            height: 1440,
            caption:
              "Now screen with due-date buckets, bottlenecks, 7-day chart, and epic progress",
          },
        ],
      },
      {
        id: "graph",
        badge: "Graph",
        tone: "lavender",
        title: "Review execution plans stage by stage",
        summary:
          "Inspect how blocks dependencies divide an epic into stages and where human gates hold the chain.",
        bullets: [
          "View order shows the active stage of an epic and the issues blocking it, including blockers outside the epic.",
          "A gate with no prerequisites that blocks just one task appears inside its card. Open the gate by selecting its row.",
          "Open a Blocks graph from any issue to trace upstream and downstream work. Related decisions appear inside the center card.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/graph.png",
            alt: "Five-stage epic graph with a purple border around the final task and its open human gate listed inside",
            width: 2880,
            height: 1440,
            caption: "The final task is waiting for the go/no-go decision shown inside its card.",
          },
        ],
      },
      {
        id: "attachments-diff",
        badge: "Attachments & Diff",
        tone: "mint",
        title: "Read diagrams, logs, JSON, and diffs inline",
        summary:
          "Agents attach Markdown notes, Mermaid diagrams, screenshots, recordings, and patch files; inspect them without switching tools.",
        bullets: [
          "Render Markdown and click Mermaid diagrams to enlarge; preview local images and .mp4/.webm recordings inline.",
          "Open .md, .txt, .log, .json, and .jsonl links in a dedicated text viewer with Pretty/raw switching, or expand them inline.",
          "Inspect .diff and .patch files with a changed-file tree, wrapped long lines, and word-level change highlights.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/attachments.png",
            alt: "Issue detail showing a Mermaid sequence diagram, an attached checkout screenshot, and inline-expanded Markdown note and diff",
            width: 2880,
            height: 3600,
            caption: "Mermaid diagram, local screenshot, and inline-expanded note and diff",
          },
          {
            src: "/media/screenshots/diff.png",
            alt: "Diff page for a git format-patch file with a changed-file tree on the left and wrapped diff on the right",
            width: 2880,
            height: 1800,
            caption: "Dedicated Diff viewer with changed-file tree and wrapped lines",
          },
        ],
      },
      {
        id: "decisions",
        badge: "Decisions",
        tone: "lilac",
        title: "Keep architecture decisions on record",
        summary:
          "Separate decision issues into active and closed lists with clear replacement history.",
        bullets: [
          "Dedicated screen for decision-type issues, divided into active and closed records.",
          "Follow supersedes and superseded-by links to see why an earlier decision changed.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/decisions.png",
            alt: "Decisions screen splitting active and closed decisions with supersedes and superseded-by links",
            width: 2880,
            height: 1800,
            caption: "Decisions screen linking active decisions to superseded records",
          },
        ],
      },
      {
        id: "needs-human",
        badge: "Needs human",
        tone: "coral",
        title: "Answer what your agents ask",
        summary:
          "Collect human-labeled questions and human gates together with the tasks waiting behind each gate.",
        bullets: [
          "See every waiting question and human gate alongside the issues each gate blocks.",
          "Respond or dismiss in place to unblock downstream work immediately.",
          "Enable browser notifications to get alerted when new human items arrive.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/needs-human.png",
            alt: "Needs human screen showing a response typed for a selected human gate and the task it blocks",
            width: 2880,
            height: 1800,
            caption:
              "Needs human queue showing the selected gate, response input, and blocked task",
          },
        ],
      },
      {
        id: "activity",
        badge: "Activity",
        tone: "sky",
        title: "Catch up on what happened while you were away",
        summary:
          "Review a chronological workspace feed of created, closed, commented, edited, and deleted issues.",
        bullets: [
          "Lists issues created, closed, and commented on across the workspace, newest first.",
          "Shows field edits and deletions when bd's events journal is enabled (bd config set events-journal true).",
          "A Seen on your last visit divider marks exactly where you left off.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/activity.png",
            alt: "Activity screen listing issues created, closed, and commented on today with a Seen on your last visit divider",
            width: 2880,
            height: 1800,
            caption: "Activity feed with Seen on your last visit marker",
          },
        ],
      },
      {
        id: "hygiene",
        badge: "Hygiene",
        tone: "sage",
        title: "Keep the tracker tidy",
        summary:
          "Surface stale issues, commit mentions left open, missing recommended sections, duplicates, and closable epics.",
        bullets: [
          "Detects stale issues, open issues referenced in commits, and issues missing bd-recommended sections.",
          "Finds possible duplicates and lets you close a duplicate directly from the screen.",
          "Highlights epics whose children are all closed and ready to wrap up.",
        ],
        screenshots: [
          {
            src: "/media/screenshots/hygiene.png",
            alt: "Hygiene screen showing stale issues, possible duplicates, missing sections, epics ready to close, and orphaned issues",
            width: 2880,
            height: 1800,
            caption: "Hygiene audit screen for stale, duplicate, and ready-to-close items",
          },
        ],
      },
    ],
    alsoTitle: "Also in beads-desk",
    alsoItems: [
      {
        name: "Epics & Board",
        description:
          "Browse open and closed epics with progress bars, or drag cards across columns on the Board to update status.",
      },
      {
        name: "Side panel",
        description:
          "Open a linked issue beside the one you are currently reading without losing your place.",
      },
      {
        name: "Multi-workspace tabs",
        description:
          "Open a different bd workspace in each browser tab against a single local server.",
      },
      {
        name: "3 languages & 2 themes",
        description:
          "Switch between English, Korean, and Japanese UI, and light or dark themes in Settings.",
      },
    ],
  },
  requirementsSection: {
    eyebrow: "Requirements",
    title: "Runs locally alongside your bd workflow",
    items: [
      {
        label: "Operating system",
        detail:
          "macOS, Linux, or Windows. Tested with bd 1.3.4 on macOS and GitHub Actions windows-latest.",
      },
      {
        label: "Node.js",
        detail: "Node.js 22 or later.",
      },
      {
        label: "bd CLI",
        detail:
          "The bd binary on PATH, or pass its path via BD_BIN (npm-installed bd on Windows is detected automatically).",
      },
      {
        label: "Beads workspace",
        detail: "Any directory initialized with bd init.",
      },
    ],
  },
  installSection: {
    eyebrow: "Getting Started",
    title: "Install once and launch in any workspace",
    subtitle:
      "The daemon listens only on 127.0.0.1, opens the active workspace in your browser, and keeps running in the background.",
    steps: [
      {
        step: "01",
        title: "Install the package globally",
        description: "Install with npm or pnpm.",
        commands: [
          { id: "install-npm", label: "npm", code: "npm install -g @seungyeop-lee/beads-desk" },
          { id: "install-pnpm", label: "pnpm", code: "pnpm add -g @seungyeop-lee/beads-desk" },
        ],
        note: "If you have never installed a global package with pnpm, run pnpm setup once and open a new shell first.",
      },
      {
        step: "02",
        title: "Start the server in your workspace",
        description:
          "Run bd-desk from a Beads workspace root or any of its subdirectories to register it and open the UI.",
        commands: [{ id: "start-cmd", label: "CLI", code: "bd-desk start --open" }],
      },
    ],
    lifecycleTitle: "Managing the server",
    lifecycleItems: [
      {
        label: "Stop",
        command: "bd-desk stop",
        detail: "Stops the background server.",
      },
      {
        label: "Update",
        command: "bd-desk restart",
        detail: "Run the install command again, then restart the server.",
      },
      {
        label: "Full guide",
        detail:
          "See USAGE.md for options, multiple workspaces, browser notifications, local file links, and troubleshooting.",
      },
    ],
  },
  footer: {
    tagline:
      "Local-first web UI for Beads (bd) issue trackers. Read-only and write operations always go through the bd CLI.",
    contributingTitle: "Contributing",
    contributingText:
      "Bug reports and feature ideas are welcome as GitHub issues; pull requests are not accepted.",
    contributingLinkText: "Read CONTRIBUTING.md",
    linksTitle: "Resources",
    usageGuideLabel: "Usage Guide",
    usageGuideHref: "https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md",
    changelogLabel: "Changelog",
    issuesLabel: "GitHub Issues",
    licenseLabel: "MIT License",
    acknowledgementsPrefix: "Inspired by ",
    acknowledgementsLinkText: "mantoni/beads-ui",
    acknowledgementsSuffix: ".",
  },
};
