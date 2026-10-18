import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DemoIssue, RunBd } from "@beads-desk/promo/seed/acmeProject";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** 상세 화면의 로컬 파일 미리보기에 쓰는 그림입니다. 저장소 안에 있으므로 workspace 밖의 경로(403)로도 씁니다. */
const SAMPLE_IMAGE = fileURLToPath(new URL("../../../docs/screenshots/board.png", import.meta.url));
const IMAGE_IN_WORKSPACE = "docs/sample-board.png";

/**
 * acme 데모 데이터에 더하는 수동 테스트용 이슈입니다. 데모 데이터에 없는 상태와, 화면 배치를 흔드는 경계 데이터를 담습니다.
 */
export function edgeCaseIssues(now: number, workspace: string): DemoIssue[] {
  const ago = (days: number, hours = 0) => now - days * DAY - hours * HOUR;

  return [
    // 큰 epic plan: 여덟 단계 blocks 사슬과 병렬 단계, 순서 없는 child, 안쪽 epic, epic 바깥 blocker(acme-q7s)가 있습니다.
    {
      id: "acme-r9d",
      title: "Migrate billing data to the new schema",
      type: "epic",
      priority: 1,
      description:
        "Move every customer, plan, and invoice record to the v2 billing schema without downtime.",
      createdAt: ago(25),
      startedAt: ago(12),
    },
    ...migrationStages(ago),
    {
      id: "acme-r9d.10",
      title: "Write the migration FAQ for support",
      type: "chore",
      priority: 3,
      description: "Questions support expects from customers during the migration window.",
      parent: "acme-r9d",
      createdAt: ago(9),
    },
    {
      id: "acme-r9d.11",
      title: "Clean up the old billing tables",
      type: "chore",
      priority: 4,
      description: "Drop the v1 tables a month after the switch.",
      parent: "acme-r9d",
      createdAt: ago(9),
    },
    {
      id: "acme-r9d.12",
      title: "Reconcile invoices after the migration",
      type: "epic",
      priority: 2,
      description: "Make sure every migrated invoice matches its original total.",
      parent: "acme-r9d",
      createdAt: ago(8),
    },
    {
      id: "acme-r9d.12.1",
      title: "Compare invoice totals between v1 and v2",
      type: "task",
      priority: 2,
      description: "A nightly job that lists invoices whose totals differ.",
      parent: "acme-r9d.12",
      createdAt: ago(8),
    },
    {
      id: "acme-r9d.12.2",
      title: "Report mismatched invoices to finance",
      type: "task",
      priority: 2,
      description: "Send the mismatch list to finance every morning.",
      parent: "acme-r9d.12",
      blockedBy: ["acme-r9d.12.1"],
      createdAt: ago(8),
    },
    {
      id: "acme-q7s",
      title: "Get read access to the finance data warehouse",
      type: "task",
      priority: 1,
      description: "The reconciliation job needs read access to the finance warehouse.",
      assignee: "priya",
      createdAt: ago(10),
      startedAt: ago(2),
    },

    // epic 상태: child가 없는 epic, child가 모두 닫혔지만 열려 있는 epic, 오래전에 닫힌 epic입니다.
    {
      id: "acme-n0c",
      title: "Partner integrations",
      type: "epic",
      priority: 3,
      description: "Placeholder until we pick the first partners.",
      createdAt: ago(3),
    },
    {
      id: "acme-d1n",
      title: "Status page",
      type: "epic",
      priority: 2,
      description: "A public page that shows uptime and incidents.",
      createdAt: ago(18),
    },
    {
      id: "acme-d1n.1",
      title: "Pick a hosted status page provider",
      type: "task",
      priority: 2,
      description: "Compare providers on price and custom domain support.",
      assignee: "jordan",
      parent: "acme-d1n",
      createdAt: ago(18),
      startedAt: ago(16),
      closedAt: ago(14),
      closeReason: "Chose the provider with custom domain support on the cheapest plan.",
    },
    {
      id: "acme-d1n.2",
      title: "Point status.acme.dev at the provider",
      type: "task",
      priority: 2,
      description: "Add the CNAME and verify the certificate.",
      assignee: "priya",
      parent: "acme-d1n",
      blockedBy: ["acme-d1n.1"],
      createdAt: ago(18),
      startedAt: ago(10),
      closedAt: ago(9),
      closeReason: "status.acme.dev is live.",
    },
    {
      id: "acme-c0d",
      title: "Beta program",
      type: "epic",
      priority: 2,
      description: "Invite the first fifty teams and collect feedback.",
      createdAt: ago(60),
      startedAt: ago(58),
      closedAt: ago(40),
      closeReason: "Beta ended with 52 teams.",
    },
    {
      id: "acme-c0d.1",
      title: "Send beta invitations",
      type: "task",
      priority: 2,
      description: "Invite the teams from the waitlist in three waves.",
      assignee: "sam",
      parent: "acme-c0d",
      createdAt: ago(60),
      startedAt: ago(58),
      closedAt: ago(41),
      closeReason: "All three waves sent.",
    },
    {
      id: "acme-c0d.2",
      title: "Summarize beta feedback",
      type: "task",
      priority: 2,
      description: "Group the feedback by theme for the launch planning.",
      assignee: "nina",
      parent: "acme-c0d",
      createdAt: ago(45),
      startedAt: ago(30),
      closedAt: ago(20),
      closeReason: "Summary shared in the launch planning doc.",
    },

    // 작업 상태의 경계: 진행 중인데 막힌 이슈, human 라벨이 blocked·deferred와 겹친 이슈, 기한 없이 미룬 이슈 등입니다.
    // 의존 없이 blocked인 이슈와 bd 기본 상태 목록 밖의 상태(pinned)는 import 뒤에 CLI로 바꿉니다.
    {
      id: "acme-s1b",
      title: "Renew the code signing certificate",
      type: "chore",
      priority: 1,
      description: "Blocked on the vendor, who has not replied yet. There is no issue to link.",
      createdAt: ago(4),
    },
    {
      id: "acme-s2p",
      title: "Release checklist template",
      type: "task",
      priority: 3,
      description: "Pinned so it stays at hand for every release.",
      createdAt: ago(30),
    },
    {
      id: "acme-s3h",
      title: "Decide the refund policy for annual plans",
      type: "task",
      priority: 1,
      description:
        "Needs a decision from Sam, but only after the annual billing question is settled.",
      labels: ["human", "payments"],
      blockedBy: ["acme-q2z"],
      createdAt: ago(2),
    },
    {
      id: "acme-s4d",
      title: "Choose a support tool after launch",
      type: "task",
      priority: 3,
      description: "Sam picks the tool once we know the ticket volume.",
      labels: ["human", "support"],
      createdAt: ago(5),
      deferUntil: now + 14 * DAY,
    },
    {
      id: "acme-s5i",
      title: "Add tax IDs to receipts",
      type: "task",
      priority: 2,
      description: "Started before the receipt email existed, so it waits on that work now.",
      assignee: "nina",
      labels: ["backend", "email"],
      blockedBy: ["acme-k3v.4"],
      createdAt: ago(3),
      startedAt: ago(1),
    },
    {
      id: "acme-s6u",
      title: "Investigate a native desktop app",
      type: "feature",
      priority: 4,
      description: "Iceboxed with no date until customers ask for it.",
      createdAt: ago(22),
    },
    {
      id: "acme-s7a",
      title: "Rotate the staging database password",
      type: "chore",
      priority: 2,
      description: "Someone started it but nobody is assigned.",
      labels: ["infra", "security"],
      createdAt: ago(2),
      startedAt: ago(0, 5),
    },
    {
      id: "acme-s8c",
      title: "Remove the legacy login redirect",
      type: "task",
      priority: 3,
      description: "Closed without ever being started, so it has no cycle time.",
      labels: ["frontend"],
      createdAt: ago(6),
      closedAt: ago(2, 2),
      closeReason: "Already removed together with the magic link work.",
    },

    // 해제 안내 toast의 "그 밖 N개": acme-f4n을 닫으면 다섯 이슈가 한꺼번에 풀립니다.
    {
      id: "acme-f4n",
      title: "Publish the shared design tokens package",
      type: "task",
      priority: 1,
      description:
        "Colors, spacing, and type scale as one package the web and email templates both use.",
      assignee: "maya",
      labels: ["frontend", "design"],
      createdAt: ago(7),
      startedAt: ago(3),
    },
    ...[
      [
        "Move button colors to tokens",
        "Primary, secondary, and danger buttons still use hex values.",
      ],
      [
        "Use spacing tokens in form layouts",
        "Inputs and labels have hand-tuned margins that drift between pages.",
      ],
      [
        "Apply the type scale to data tables",
        "Table headers use a font size that is not on the scale.",
      ],
      ["Theme toast notifications", "Success and error toasts pick their own greens and reds."],
      [
        "Inline tokens into the email templates",
        "Mail clients ignore CSS variables, so the build has to inline the values.",
      ],
    ].map(([title, description], index): DemoIssue => ({
      id: `acme-tk${index + 1}`,
      title: title!,
      type: "task",
      priority: 2,
      description: description!,
      labels: ["frontend", "design"],
      blockedBy: ["acme-f4n"],
      createdAt: ago(7),
    })),

    // Hygiene: 30일 넘게 손대지 않은 이슈, 제목과 본문이 거의 같은 두 이슈입니다. 미해결 이슈를 언급하는 commit은 CLI로 만듭니다.
    {
      id: "acme-o3l",
      title: "Audit third-party scripts on the marketing site",
      type: "task",
      priority: 3,
      description: "List every third-party script and who owns it.",
      labels: ["marketing", "security"],
      createdAt: ago(45),
    },
    {
      id: "acme-o4l",
      title: "Write onboarding docs for new engineers",
      type: "chore",
      priority: 3,
      description: "How to run the stack locally, deploy, and get on call.",
      createdAt: ago(38),
    },
    {
      id: "acme-u1p",
      title: "Login page shows a blank screen on Safari",
      type: "bug",
      priority: 2,
      description:
        "When opening the login page in Safari 17 the page is blank and the console shows a script error.",
      labels: ["frontend"],
      createdAt: ago(1, 6),
    },
    {
      id: "acme-u2p",
      title: "Login page shows a blank screen in Safari",
      type: "bug",
      priority: 2,
      description:
        "When opening the login page in Safari 17 the page stays blank and the console shows a script error.",
      labels: ["frontend"],
      createdAt: ago(1, 2),
    },

    // 화면 배치의 경계: 긴 제목, 끊을 곳 없는 긴 낱말, 한국어, 많은 라벨, 여러 Markdown 요소와 로컬 파일 경로, 빈 본문입니다.
    {
      id: "acme-l1t",
      title:
        "When a customer upgrades from the Starter plan to the Business plan in the middle of a billing cycle and also adds seats on the same day, the prorated amount on the confirmation screen does not match the next invoice",
      type: "bug",
      priority: 1,
      description:
        "A very long title to check wrapping in rows, cards, graph nodes, the detail header, and the side panel.",
      assignee: "leo",
      labels: ["backend", "payments"],
      createdAt: ago(1, 4),
      startedAt: ago(0, 6),
    },
    {
      id: "acme-l2t",
      title:
        "Fix the crash in BillingPortalSessionControllerIntegrationTestWithStripeWebhookReplayAndIdempotencyKeys",
      type: "bug",
      priority: 2,
      description:
        "The title and this path have no place to break: `/api/billing/portal/sessions/create-with-return-url-and-locale-and-customer-email-prefill`",
      labels: ["qa"],
      createdAt: ago(2, 1),
    },
    {
      id: "acme-k1r",
      title:
        "결제 페이지의 오류 문구를 한국어로 번역하고, 카드 거절 사유별로 고객이 바로 할 수 있는 조치를 함께 안내한다",
      type: "task",
      priority: 2,
      description:
        "## 배경\n\n한국 고객이 결제에 실패하면 영어 오류 문구만 보여서 문의가 늘었습니다.\n\n## 할 일\n\n- 거절 사유 코드마다 한국어 문구를 정합니다.\n- `insufficient_funds`는 다른 카드를 쓰라고 안내합니다.\n\n## Acceptance Criteria\n\n- 한국어 브라우저에서 거절된 카드로 결제하면 한국어 문구가 보입니다.",
      assignee: "nina",
      labels: ["frontend", "payments", "i18n"],
      createdAt: ago(3, 2),
      startedAt: ago(1, 1),
      comments: [
        {
          author: "nina",
          text: "번역 초안을 올렸어요. `card_declined`는 사유를 알 수 없어서 일반 문구로 두었습니다.",
          at: ago(1),
        },
        {
          author: "sam",
          text: '좋아요. 다만 "잔액 부족"은 고객이 민감하게 받아들일 수 있어서 "카드 한도나 잔액을 확인해 주세요"로 바꿔 주세요.',
          at: ago(0, 8),
        },
      ],
    },
    {
      id: "acme-k2r",
      title: "라벨이 많은 이슈",
      type: "chore",
      priority: 3,
      description: "라벨이 많을 때 행과 카드, 상세 화면에서 줄바꿈을 확인합니다.",
      labels: [
        "frontend",
        "backend",
        "infra",
        "payments",
        "email",
        "security",
        "accessibility-and-internationalization",
        "needs-design-review",
        "i18n",
        "qa",
      ],
      createdAt: ago(2, 3),
    },
    {
      id: "acme-m8d",
      title: "Document the checkout architecture",
      type: "task",
      priority: 2,
      description: richMarkdown(workspace),
      acceptance:
        "- [ ] The diagram matches the deployed services\n- [ ] Every table row links to its runbook",
      assignee: "leo",
      labels: ["docs"],
      createdAt: ago(4),
      startedAt: ago(1, 2),
      comments: [
        { author: "leo", text: "First draft is up.", at: ago(1, 1) },
        { author: "maya", text: "Can we add the webhook retry policy?", at: ago(1) },
        {
          author: "leo",
          text: 'Added:\n\n```ts\nconst retry = { attempts: 5, backoff: "exponential" };\n```',
          at: ago(0, 20),
        },
        {
          author: "priya",
          text: "The staging hostnames in the table are out of date.",
          at: ago(0, 10),
        },
        { author: "leo", text: "Fixed the hostnames.", at: ago(0, 6) },
        { author: "sam", text: "Looks good. Ship it after the review.", at: ago(0, 2) },
      ],
    },
    {
      id: "acme-e0b",
      title: "Empty issue with only a title",
      type: "task",
      priority: 2,
      description: "",
      createdAt: ago(0, 3),
    },

    // 결정: 세 단계 supersede 사슬(dc1 → dc2 → dc3), 작업 이슈로 대체되는 결정, 진행 중으로 바꾼 결정입니다. 관계는 CLI로 만듭니다.
    {
      id: "acme-dc1",
      title: "Keep session tokens in localStorage",
      type: "decision",
      priority: 2,
      description: "Simplest option for the first prototype.",
      createdAt: ago(40),
    },
    {
      id: "acme-dc2",
      title: "Keep session tokens in a cookie readable by scripts",
      type: "decision",
      priority: 2,
      description: "Lets the server read the token as well as the client.",
      createdAt: ago(25),
    },
    {
      id: "acme-dc3",
      title: "Keep session tokens in an HttpOnly cookie",
      type: "decision",
      priority: 1,
      description: "Scripts can no longer read the token, which closes the XSS exfiltration path.",
      createdAt: ago(9),
    },
    {
      id: "acme-dc4",
      title: "Write our own feature flag service",
      type: "decision",
      priority: 3,
      description: "We only need on/off flags per workspace.",
      createdAt: ago(16),
    },
    {
      id: "acme-dc5",
      title: "Adopt the hosted feature flag service",
      type: "task",
      priority: 2,
      description: "Replaces the plan to build our own flags service.",
      labels: ["backend"],
      createdAt: ago(8),
    },
    {
      id: "acme-dc6",
      title: "출시 첫 달에는 기능 추가 없이 안정화에만 집중한다",
      type: "decision",
      priority: 1,
      description:
        "출시 직후 한 달 동안은 장애와 성능 문제만 고치고, 새 기능은 다음 달 계획으로 넘깁니다.",
      createdAt: ago(5),
    },

    // human gate의 막힌 이슈 수(0개, 1개, 여러 개)와 이전 회차 기록, 사람 손을 기다리지 않는 timer gate입니다. gate는 CLI로 만듭니다.
    {
      id: "acme-h1g",
      title: "Publish the security whitepaper",
      type: "task",
      priority: 2,
      description: "Explains how we store payment data and who can access it.",
      labels: ["security", "marketing"],
      createdAt: ago(10),
    },
    {
      id: "acme-h2g",
      title: "Announce the launch on social media",
      type: "task",
      priority: 2,
      description: "Posts for the launch day, scheduled per time zone.",
      labels: ["marketing"],
      createdAt: ago(6),
    },
    {
      id: "acme-h3g",
      title: "Send the launch newsletter",
      type: "task",
      priority: 2,
      description: "The newsletter goes out an hour after the social posts.",
      labels: ["marketing", "email"],
      createdAt: ago(6),
    },
    {
      id: "acme-h4g",
      title: "Retire the old marketing site",
      type: "task",
      priority: 3,
      description: "Closed after its gate was opened, so the gate blocks nothing open.",
      labels: ["marketing"],
      createdAt: ago(12),
    },
  ];
}

/**
 * import로 만들 수 없는 상태, gate, supersede, 활동 기록, workspace 파일과 commit을 CLI로 더합니다.
 * 활동 기록의 시각은 seed를 실행한 시각입니다.
 */
export function addEdgeCaseActivity(bd: RunBd, git: RunBd, workspace: string): void {
  bd("update", "acme-s1b", "--status", "blocked", "--actor", "priya");
  bd("update", "acme-s2p", "--status", "pinned", "--actor", "sam");
  bd("defer", "acme-s6u", "--actor", "sam");
  bd("update", "acme-dc6", "--status", "in_progress", "--actor", "sam");

  bd("supersede", "acme-dc1", "--with", "acme-dc2", "--actor", "leo");
  bd("supersede", "acme-dc2", "--with", "acme-dc3", "--actor", "leo");
  bd("supersede", "acme-dc4", "--with", "acme-dc5", "--actor", "sam");

  bd(
    "update",
    "acme-m8d",
    "--design",
    "Keep the diagram in the repo as Mermaid so it is reviewed with the code.",
    "--notes",
    "- The staging hostnames come from the infra repo.\n- Ask Priya before changing the webhook section.",
    "--actor",
    "leo",
  );

  // 같은 이슈에 gate를 세 번 엽니다. 앞의 두 번은 닫혀 이전 회차가 되고, 마지막 gate가 열려 있습니다.
  const firstRound = gate(
    bd,
    "acme-h1g",
    "Whitepaper sign-off from legal",
    "Legal checks every claim about compliance.",
    "sam",
  );
  bd(
    "comments",
    "add",
    firstRound,
    "Remove the sentence about SOC 2. We are not certified yet.",
    "--actor",
    "jordan",
  );
  bd("gate", "resolve", firstRound, "--reason", "Changes requested", "--actor", "jordan");
  const secondRound = gate(
    bd,
    "acme-h1g",
    "Whitepaper sign-off from legal",
    "Second pass after the SOC 2 edit.",
    "sam",
  );
  bd(
    "gate",
    "resolve",
    secondRound,
    "--reason",
    "One more wording change on data retention.",
    "--actor",
    "jordan",
  );
  gate(bd, "acme-h1g", "Whitepaper sign-off from legal", "Final check before we publish.", "sam");

  // gate 하나가 이슈 둘을 막습니다.
  const launchPosts = gate(
    bd,
    "acme-h2g",
    "출시 공지 문구 최종 확인",
    "마케팅 문구가 법무 검토를 통과했는지 Sam이 확인합니다.",
    "sam",
  );
  bd("dep", "add", "acme-h3g", launchPosts, "--actor", "sam");
  // 막던 이슈를 닫아 gate만 열려 있습니다. gate가 막는 이슈는 닫을 수 없으므로 --force로 닫습니다.
  const retired = gate(bd, "acme-h4g", "Confirm redirects for the old site", "", "jordan");
  bd(
    "update",
    retired,
    "--description",
    "Jordan confirms the redirect list.\n\nThis description was written by hand, not by `bd gate create`.",
    "--actor",
    "jordan",
  );
  bd("close", "acme-h4g", "--force", "--reason", "Retired early by marketing.", "--actor", "sam");
  // 사람이 응답하지 않아도 시간이 지나면 풀리는 gate입니다. Graph에서 human gate와 다른 선으로 그립니다.
  bd(
    "gate",
    "create",
    "--type=timer",
    "--timeout=72h",
    "--blocks",
    "acme-r9d.5",
    "--title",
    "Wait 72 hours after the dry run",
    "--actor",
    "priya",
  );

  // 활동 탭에 여러 종류의 기록이 남는 이슈입니다.
  const activity = bd(
    "create",
    "Show usage limits on the billing page",
    "--type=task",
    "--priority=3",
    "--labels=frontend",
    "--description=Show how many seats and projects are left on the current plan.",
    "--actor",
    "sam",
    "--silent",
  ).trim();
  bd("update", activity, "--priority", "1", "--actor", "sam");
  bd("label", "add", activity, "payments", "--actor", "sam");
  bd("label", "remove", activity, "frontend", "--actor", "sam");
  bd("dep", "add", activity, "acme-k3v.2", "--type", "related", "--actor", "sam");
  bd("dep", "add", activity, "acme-f4n", "--actor", "maya");
  bd("dep", "remove", activity, "acme-f4n", "--actor", "maya");
  bd("update", activity, "--claim", "--actor", "maya");
  bd(
    "update",
    activity,
    "--description",
    "Show seats, projects, and API calls left on the current plan.",
    "--actor",
    "maya",
  );
  bd("defer", activity, "--until", "+3d", "--actor", "maya");
  bd("undefer", activity, "--actor", "maya");
  bd(
    "comments",
    "add",
    activity,
    "Back on it. The API call count comes from the usage service.",
    "--actor",
    "maya",
  );

  mkdirSync(join(workspace, "docs"), { recursive: true });
  copyFileSync(SAMPLE_IMAGE, join(workspace, IMAGE_IN_WORKSPACE));
  git("add", IMAGE_IN_WORKSPACE);
  // bd orphans는 아직 닫히지 않은 이슈의 ID를 언급하는 commit을 찾습니다.
  git("commit", "--quiet", "-m", "Add the stale onboarding docs draft (acme-o4l)");
}

/** 이 이슈를 막는 human gate를 열고 ID를 돌려줍니다. */
function gate(bd: RunBd, blocks: string, title: string, reason: string, actor: string): string {
  const reasonArgs = reason ? ["--reason", reason] : [];
  const created = bd(
    "gate",
    "create",
    "--type=human",
    "--blocks",
    blocks,
    "--title",
    title,
    ...reasonArgs,
    "--actor",
    actor,
    "--json",
  );
  return (JSON.parse(created) as { id: string }).id;
}

/** 여덟 단계 blocks 사슬입니다. .2와 .3, .6과 .7은 같은 단계에서 나란히 진행합니다. */
function migrationStages(ago: (days: number, hours?: number) => number): DemoIssue[] {
  const stage = (
    n: number,
    title: string,
    description: string,
    blockedBy: string[],
    progress: Pick<DemoIssue, "assignee" | "startedAt" | "closedAt" | "closeReason"> = {},
  ): DemoIssue => ({
    id: `acme-r9d.${n}`,
    title,
    type: "task",
    priority: 1,
    description,
    labels: ["backend", "payments"],
    parent: "acme-r9d",
    blockedBy,
    createdAt: ago(20),
    ...progress,
  });
  return [
    stage(
      1,
      "Design the v2 billing schema",
      "Tables for customers, plans, subscriptions, and invoices.",
      [],
      {
        assignee: "leo",
        startedAt: ago(19),
        closedAt: ago(15),
        closeReason: "Schema reviewed by the backend team.",
      },
    ),
    stage(
      2,
      "Write the customer migration script",
      "Copies customers and keeps their Stripe IDs.",
      ["acme-r9d.1"],
      {
        assignee: "leo",
        startedAt: ago(14),
        closedAt: ago(8),
        closeReason: "Script handles every customer state we found in production.",
      },
    ),
    stage(
      3,
      "Write the invoice migration script",
      "Converts line items and recalculates tax totals.",
      ["acme-r9d.1"],
      {
        assignee: "nina",
        startedAt: ago(13),
        closedAt: ago(6),
        closeReason: "Merged.",
      },
    ),
    stage(
      4,
      "Dry run on a staging copy",
      "Run both scripts against last night's snapshot and count rejected rows.",
      ["acme-r9d.2", "acme-r9d.3", "acme-q7s"],
      { assignee: "priya", startedAt: ago(2) },
    ),
    stage(5, "Fix the records the dry run rejected", "Mostly coupons that expired before 2023.", [
      "acme-r9d.4",
    ]),
    stage(6, "Move customer records in production", "Run during the Sunday maintenance window.", [
      "acme-r9d.5",
    ]),
    stage(7, "Backfill invoices in production", "Throttled so the API stays responsive.", [
      "acme-r9d.5",
    ]),
    stage(
      8,
      "Switch the API to read from v2",
      "Flip the read flag per region and watch error rates.",
      ["acme-r9d.6", "acme-r9d.7"],
    ),
    stage(9, "Remove the v1 read path", "Delete the old queries once v2 has served a full week.", [
      "acme-r9d.8",
    ]),
  ];
}

/** 상세 화면의 Markdown 렌더링을 확인하는 본문입니다. 로컬 파일 경로는 workspace 위치에 따라 달라집니다. */
function richMarkdown(workspace: string): string {
  return [
    "## Overview",
    "",
    "Checkout talks to **three** services. See [Stripe docs](https://docs.stripe.com) and the pricing work in acme-k3v.2.",
    "",
    "```mermaid",
    "flowchart LR",
    "  Browser --> API",
    "  API --> Stripe",
    "  Stripe -- webhook --> API",
    "  API --> Postmark",
    "```",
    "",
    "| Service | Staging host | Owner |",
    "| --- | --- | --- |",
    "| API | api.staging.acme.dev | leo |",
    "| Webhooks | hooks.staging.acme.dev | leo |",
    "| Email | Postmark sandbox | nina |",
    "",
    "```ts",
    "export async function createIntent(planId: string): Promise<string> {",
    '  const intent = await stripe.paymentIntents.create({ amount: price(planId), currency: "usd" });',
    "  return intent.client_secret!;",
    "}",
    "```",
    "",
    "> Card data never touches our servers.",
    "",
    "1. The browser asks the API for a client secret",
    "2. Stripe.js confirms the payment",
    "3. The webhook marks the subscription active",
    "",
    "### Local files",
    "",
    "An image inside the workspace renders:",
    "",
    `![board](${join(workspace, IMAGE_IN_WORKSPACE)})`,
    "",
    `A file outside the workspace is refused: [outside](${SAMPLE_IMAGE})`,
    "",
    `A missing file shows not found: [missing](${join(workspace, "docs/missing.png")})`,
  ].join("\n");
}
