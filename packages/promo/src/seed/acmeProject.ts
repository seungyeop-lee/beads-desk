/** 소개 자료에 쓰는 데모 프로젝트의 이슈 prefix입니다. */
export const ACME_PREFIX = "acme";

/** `bd import`로 넣는 데모 이슈 하나입니다. 시각은 epoch ms이고, 저장 상태는 시각에서 정합니다(toImportRecord). */
export type DemoIssue = {
  id: string;
  title: string;
  type: "epic" | "feature" | "task" | "bug" | "chore" | "decision";
  priority: number;
  description: string;
  acceptance?: string;
  assignee?: string;
  labels?: string[];
  parent?: string;
  /** 이 이슈보다 먼저 끝나야 하는 이슈입니다. */
  blockedBy?: string[];
  related?: string[];
  discoveredFrom?: string;
  createdAt: number;
  startedAt?: number;
  closedAt?: number;
  closeReason?: string;
  deferUntil?: number;
  comments?: { author: string; text: string; at: number }[];
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * "웹 앱 출시 준비"를 주제로 한 데모 이슈입니다. 시각은 모두 now 기준의 상대값입니다.
 * 지금 화면의 Flow 통계는 오늘을 포함한 최근 7일만 집계하고 보드의 Closed 열은 기본으로 오늘 닫힌 이슈만 보이므로,
 * 고정 날짜를 넣으면 며칠 뒤에는 두 화면이 비게 됩니다.
 */
export function acmeIssues(now: number): DemoIssue[] {
  const ago = (days: number, hours = 0) => now - days * DAY - hours * HOUR;
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  // 자정 직후에 seed를 실행해도 오늘 닫힌 것으로 보이도록, 자정과 지금 사이의 시각에 닫습니다.
  const earlierToday = startOfToday + (now - startOfToday) / 2;

  return [
    // 결제 epic: 닫힌 child와 여러 단계의 blocks 사슬(.1 → .3 → .4 → .5), epic 바깥의 blocker(acme-7qx)가 있습니다.
    {
      id: "acme-k3v",
      title: "Checkout and billing ready for launch",
      type: "epic",
      priority: 1,
      description:
        "Everything a customer needs on launch day to pick a plan, pay, and get a receipt.\n\nOut of scope: invoicing for enterprise accounts. Sales handles those manually for now.",
      createdAt: ago(13),
    },
    {
      id: "acme-k3v.1",
      title: "Integrate Stripe Payment Intents on the API",
      type: "task",
      priority: 1,
      description:
        "Create payment intents server-side so card details never touch our servers. The client confirms the intent with Stripe.js.",
      acceptance:
        "- `POST /api/billing/intents` returns a client secret for the selected plan\n- Webhook marks the subscription active after `payment_intent.succeeded`",
      assignee: "leo",
      labels: ["backend", "payments"],
      parent: "acme-k3v",
      createdAt: ago(13),
      startedAt: ago(8),
      closedAt: ago(4, 3),
      closeReason: "Merged in #412. Webhook handling is covered by integration tests.",
    },
    {
      id: "acme-k3v.2",
      title: "Add plan selection to the pricing page",
      type: "feature",
      priority: 2,
      description:
        "Let visitors compare Starter, Team, and Business and start checkout from the plan they pick.",
      assignee: "maya",
      labels: ["frontend"],
      parent: "acme-k3v",
      createdAt: ago(12),
      startedAt: ago(5, 6),
      closedAt: ago(3, 2),
      closeReason: "Shipped behind the `pricing_v2` flag.",
    },
    {
      id: "acme-k3v.3",
      title: "Build the checkout page with card and Apple Pay",
      type: "feature",
      priority: 1,
      description:
        "Single-page checkout using Stripe Elements. Show the plan, the price with tax, and the payment form side by side.",
      acceptance:
        "- Card and Apple Pay both complete a test payment on staging\n- Errors from Stripe are shown inline next to the form",
      assignee: "maya",
      labels: ["frontend", "payments"],
      parent: "acme-k3v",
      blockedBy: ["acme-k3v.1", "acme-k3v.2"],
      createdAt: ago(12),
      startedAt: ago(2, 5),
      comments: [
        {
          author: "leo",
          text: "The intents endpoint is live on staging. You can point the page at `/api/billing/intents` now.",
          at: ago(2, 3),
        },
        {
          author: "maya",
          text: "Card payments work end to end on staging. Apple Pay needs the domain verification file before I can test it.",
          at: ago(1, 1),
        },
      ],
    },
    {
      id: "acme-k3v.4",
      title: "Send a receipt email after a successful payment",
      type: "task",
      priority: 2,
      description:
        "Send a receipt with the plan, amount, tax, and a link to the billing portal as soon as the payment succeeds.",
      labels: ["backend", "email"],
      parent: "acme-k3v",
      blockedBy: ["acme-k3v.3", "acme-7qx"],
      createdAt: ago(9),
    },
    {
      id: "acme-k3v.5",
      title: "End-to-end tests for the checkout flow",
      type: "task",
      priority: 2,
      description:
        "Cover plan selection, a successful card payment, a declined card, and the receipt email using Stripe test cards.",
      labels: ["qa"],
      parent: "acme-k3v",
      blockedBy: ["acme-k3v.4"],
      createdAt: ago(9),
    },
    {
      id: "acme-k3v.6",
      title: "Show a clear message when a card is declined",
      type: "task",
      priority: 1,
      description:
        'Map Stripe decline codes to messages a customer can act on, like "Your card has insufficient funds. Try another card."',
      labels: ["frontend", "payments"],
      parent: "acme-k3v",
      blockedBy: ["acme-k3v.1"],
      createdAt: ago(4),
    },
    {
      id: "acme-k3v.7",
      title: "Show prorated charges when a customer upgrades mid-cycle",
      type: "feature",
      priority: 2,
      description:
        "Before confirming an upgrade, show what the customer pays today and what the next invoice will be.",
      assignee: "leo",
      labels: ["backend", "payments"],
      parent: "acme-k3v",
      createdAt: ago(6),
      startedAt: ago(1, 3),
      closedAt: earlierToday,
      closeReason:
        "The preview now comes from Stripe's upcoming invoice API, so it always matches the bill.",
    },

    // 인프라 epic: 닫힌 child부터 출시 당일 작업까지 다섯 단계 blocks 사슬(.1 → .2 → .3 → .5 → .6)입니다.
    {
      id: "acme-p8d",
      title: "Production infrastructure and launch day",
      type: "epic",
      priority: 0,
      description:
        "Production has to handle launch traffic, page us when it doesn't, and give us a tested plan for the switch-over.",
      createdAt: ago(15),
    },
    {
      id: "acme-p8d.1",
      title: "Set up a staging environment that mirrors production",
      type: "chore",
      priority: 1,
      description:
        "Same instance sizes, same database version, and a nightly copy of anonymized production data.",
      assignee: "priya",
      labels: ["infra"],
      parent: "acme-p8d",
      createdAt: ago(15),
      startedAt: ago(10),
      closedAt: ago(5, 4),
      closeReason: "Staging is live at staging.acme.dev and refreshes nightly.",
    },
    {
      id: "acme-p8d.2",
      title: "Configure autoscaling for the API service",
      type: "task",
      priority: 1,
      description:
        "Scale on CPU and request latency. Keep at least three instances across two zones.",
      assignee: "priya",
      labels: ["infra"],
      parent: "acme-p8d",
      blockedBy: ["acme-p8d.1"],
      createdAt: ago(10),
      startedAt: ago(4, 2),
      closedAt: ago(2, 6),
      closeReason: "Scales from 3 to 12 instances. Verified on staging with a synthetic spike.",
    },
    {
      id: "acme-p8d.3",
      title: "Load test the API at twice the expected launch traffic",
      type: "task",
      priority: 1,
      description:
        "Replay the signup, login, and checkout mix at 2x the traffic marketing expects on launch day.",
      acceptance: "- p95 latency stays under 300 ms\n- Error rate stays under 0.1%",
      assignee: "priya",
      labels: ["infra", "performance"],
      parent: "acme-p8d",
      blockedBy: ["acme-p8d.2"],
      createdAt: ago(8),
      startedAt: ago(1, 6),
      comments: [
        {
          author: "priya",
          text: "At 1x, p95 held under 180 ms. At 1.6x, login and signup started returning 429s from the auth provider, so I filed acme-f5r.",
          at: ago(1, 2),
        },
      ],
    },
    {
      id: "acme-p8d.4",
      title: "Write the launch day runbook",
      type: "task",
      priority: 1,
      description:
        "Who does what and when on launch day: the switch-over steps, the rollback plan, and who to call if payments fail.",
      assignee: "jordan",
      labels: ["ops"],
      parent: "acme-p8d",
      createdAt: ago(7),
      startedAt: ago(3, 1),
    },
    {
      id: "acme-p8d.5",
      title: "Sign off the go-live checklist",
      type: "task",
      priority: 0,
      description:
        "Walk through the checklist with engineering, support, and marketing and record who signed off on each item.",
      assignee: "sam",
      labels: ["ops"],
      parent: "acme-p8d",
      blockedBy: ["acme-p8d.3", "acme-p8d.4"],
      createdAt: ago(7),
    },
    {
      id: "acme-p8d.6",
      title: "Point the production domain at the new load balancer",
      type: "task",
      priority: 0,
      description:
        "Lower the DNS TTL a day ahead, switch the records, and watch error rates for the first hour.",
      labels: ["infra"],
      parent: "acme-p8d",
      blockedBy: ["acme-p8d.5"],
      createdAt: ago(7),
    },
    {
      id: "acme-p8d.7",
      title: "Set up uptime checks and on-call paging",
      type: "task",
      priority: 1,
      description:
        "Check the app, the API, and the checkout page every minute from three regions and page whoever is on call.",
      labels: ["infra", "ops"],
      parent: "acme-p8d",
      createdAt: ago(5),
    },

    // 온보딩 epic: child 하나는 import 뒤에 human gate가 막고, 하나는 epic 바깥의 blocker(acme-7qx)를 기다립니다.
    {
      id: "acme-w2n",
      title: "Onboarding and marketing site",
      type: "epic",
      priority: 2,
      description:
        "New visitors should understand the product from the landing page and get to their first project in under two minutes.",
      createdAt: ago(11),
    },
    {
      id: "acme-w2n.1",
      title: "Cut the signup form down to email and workspace name",
      type: "feature",
      priority: 2,
      description:
        "Ask for the rest (team size, role) after the first project is created, not before.",
      assignee: "maya",
      labels: ["frontend", "growth"],
      parent: "acme-w2n",
      createdAt: ago(11),
      startedAt: ago(3, 4),
      closedAt: ago(1, 5),
      closeReason: "Signup completion went from 41% to 63% in the staging usability sessions.",
    },
    {
      id: "acme-w2n.2",
      title: "Write the launch announcement blog post",
      type: "task",
      priority: 2,
      description:
        "Who the product is for, the three things it does best, and a link to the pricing page.",
      assignee: "sam",
      labels: ["marketing"],
      parent: "acme-w2n",
      createdAt: ago(6),
    },
    {
      id: "acme-w2n.3",
      title: "Replace placeholder screenshots on the landing page",
      type: "task",
      priority: 3,
      description:
        "Use the real dashboard with demo data instead of the mockups from the design phase.",
      labels: ["marketing", "design"],
      parent: "acme-w2n",
      createdAt: ago(4),
    },
    {
      id: "acme-w2n.4",
      title: "Publish the updated privacy policy and terms of service",
      type: "task",
      priority: 1,
      description:
        "The new versions cover payment data and the analytics we collect. Link both from the signup form and the footer.",
      labels: ["legal"],
      parent: "acme-w2n",
      createdAt: ago(5),
    },
    {
      id: "acme-w2n.5",
      title: "Welcome email sequence for new signups",
      type: "feature",
      priority: 2,
      description:
        "Three emails over the first week: getting started, inviting the team, and connecting integrations.",
      labels: ["email", "growth"],
      parent: "acme-w2n",
      blockedBy: ["acme-7qx"],
      createdAt: ago(6),
    },

    // epic에 속하지 않은 이슈입니다.
    {
      id: "acme-7qx",
      title: "Set up Postmark for transactional email",
      type: "task",
      priority: 1,
      description:
        "Verify the sending domain, set up DKIM and SPF, and wrap the Postmark client so templates live in the repo.",
      assignee: "leo",
      labels: ["backend", "email"],
      createdAt: ago(6),
      startedAt: ago(1, 4),
    },
    {
      id: "acme-m4j",
      title: "Checkout returns a 500 when the session expires mid-payment",
      type: "bug",
      priority: 1,
      description:
        "Steps to reproduce:\n\n1. Open checkout and wait for the session to expire\n2. Submit the payment form\n\nExpected: a prompt to sign in again. Actual: a blank page and a 500 in the logs.",
      labels: ["backend", "payments"],
      discoveredFrom: "acme-k3v.3",
      createdAt: ago(1, 3),
    },
    {
      id: "acme-c9t",
      title: "Pricing table overflows the screen on iPhone SE",
      type: "bug",
      priority: 2,
      description: "The Business column is cut off at 375 px wide and can't be scrolled into view.",
      assignee: "maya",
      labels: ["frontend"],
      related: ["acme-k3v.2"],
      createdAt: ago(4, 5),
      startedAt: ago(3, 8),
      closedAt: ago(3, 1),
      closeReason: "The table stacks into cards below 480 px.",
    },
    {
      id: "acme-h6b",
      title: "Upgrade Next.js and React to the latest minor releases",
      type: "chore",
      priority: 3,
      description: "Do it before the code freeze so we launch on supported versions.",
      labels: ["frontend"],
      createdAt: ago(9),
    },
    {
      id: "acme-f5r",
      title: "Add rate limiting to the login and signup endpoints",
      type: "task",
      priority: 1,
      description:
        "Limit by IP and by email so a burst of bots can't exhaust the auth provider's quota for everyone else.",
      labels: ["backend", "security"],
      discoveredFrom: "acme-p8d.3",
      createdAt: ago(1, 2),
    },
    {
      id: "acme-g8e",
      title: "Image uploads fail for files larger than 5 MB",
      type: "bug",
      priority: 2,
      description: "The upload request times out at the proxy before it reaches storage.",
      assignee: "leo",
      labels: ["backend"],
      createdAt: ago(6, 2),
      startedAt: ago(5, 1),
      closedAt: ago(4, 6),
      closeReason: "Uploads now go straight to storage with presigned URLs.",
    },
    {
      id: "acme-x2p",
      title: "Dark mode for the dashboard",
      type: "feature",
      priority: 3,
      description:
        "Customers keep asking for it, but it isn't launch-critical. Revisit after the first month.",
      labels: ["frontend"],
      createdAt: ago(14),
      deferUntil: now + 30 * DAY,
    },
    {
      id: "acme-q2z",
      title: "Offer annual billing at launch, or wait until after beta?",
      type: "task",
      priority: 1,
      description:
        "Annual plans bring cash up front, but they lock in prices we haven't validated yet.\n\n- **Option A:** offer annual billing at launch with a 15% discount\n- **Option B:** monthly only until we have three months of churn data\n\nThe checkout page and the pricing page change depending on the answer.",
      labels: ["human", "payments"],
      createdAt: ago(2, 2),
    },

    // 결정: acme-b3s는 import 뒤에 bd supersede로 acme-t8w에 대체됩니다.
    {
      id: "acme-b3s",
      title: "Sign in with email and password, with optional 2FA",
      type: "decision",
      priority: 2,
      description:
        "Start with the most familiar sign-in flow and add 2FA for teams that ask for it.",
      createdAt: ago(20),
    },
    {
      id: "acme-t8w",
      title: "Sign in with passwordless magic links",
      type: "decision",
      priority: 1,
      description:
        "Support tickets from the beta were mostly password resets. Magic links remove that flow entirely and make the signup form shorter.",
      related: ["acme-w2n.1"],
      createdAt: ago(6),
    },
    {
      id: "acme-n5e",
      title: "Use Stripe as the only payment provider at launch",
      type: "decision",
      priority: 1,
      description:
        "Stripe covers cards, Apple Pay, and tax calculation in every launch country. A second provider can wait until we sell in regions Stripe doesn't cover.",
      createdAt: ago(14),
    },
    {
      id: "acme-r7u",
      title: "Run the API in a single region at launch",
      type: "decision",
      priority: 2,
      description:
        "Almost all beta customers are in North America. Start in us-east-1 and plan a second region once EU usage passes 20%.",
      createdAt: ago(10),
    },
    {
      id: "acme-y4k",
      title: "Self-host product analytics",
      type: "decision",
      priority: 3,
      description: "Keep event data in our own database instead of sending it to a third party.",
      createdAt: ago(18),
      closedAt: ago(8),
      closeReason:
        "Dropped. Running our own analytics stack isn't worth the ops time before launch. We'll use a hosted tool and revisit after beta.",
    },
  ];
}

/** `bd import`가 받는 JSONL 한 줄의 레코드로 바꿉니다. */
export function toImportRecord(issue: DemoIssue): Record<string, unknown> {
  const status =
    issue.closedAt !== undefined
      ? "closed"
      : issue.deferUntil !== undefined
        ? "deferred"
        : issue.startedAt !== undefined
          ? "in_progress"
          : "open";
  const comments = issue.comments ?? [];
  const lastTouched = Math.max(
    issue.createdAt,
    issue.startedAt ?? 0,
    issue.closedAt ?? 0,
    ...comments.map((comment) => comment.at),
  );
  const dependencies = [
    ...(issue.parent ? [[issue.parent, "parent-child"]] : []),
    ...(issue.blockedBy ?? []).map((id) => [id, "blocks"]),
    ...(issue.related ?? []).map((id) => [id, "related"]),
    ...(issue.discoveredFrom ? [[issue.discoveredFrom, "discovered-from"]] : []),
  ].map(([dependsOnId, type]) => ({ issue_id: issue.id, depends_on_id: dependsOnId, type }));

  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    acceptance_criteria: issue.acceptance,
    issue_type: issue.type,
    status,
    priority: issue.priority,
    assignee: issue.assignee,
    labels: issue.labels,
    dependencies,
    comments: comments.map((comment) => ({
      author: comment.author,
      text: comment.text,
      created_at: rfc3339(comment.at),
    })),
    created_at: rfc3339(issue.createdAt),
    updated_at: rfc3339(lastTouched),
    started_at: optionalRfc3339(issue.startedAt),
    closed_at: optionalRfc3339(issue.closedAt),
    close_reason: issue.closeReason,
    defer_until: optionalRfc3339(issue.deferUntil),
  };
}

// bd는 시각을 초 단위로 저장하므로 밀리초를 버립니다.
function rfc3339(time: number): string {
  return new Date(time).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function optionalRfc3339(time: number | undefined): string | undefined {
  return time === undefined ? undefined : rfc3339(time);
}

/** workspace에서 bd를 실행하고 표준 출력을 돌려줍니다. */
export type RunBd = (...args: string[]) => string;

/**
 * import로 넣을 수 없는 관계와 활동 기록을 CLI로 더합니다.
 * human gate와 supersede는 bd 명령이 만드는 관계라 import 뒤에 만듭니다.
 * 상세 화면의 활동 기록은 `bd history --events`로 읽어 import한 이슈에는 created 하나만 남으므로,
 * 활동 기록을 보여 줄 이슈는 여기서 만들고 claim하고 닫습니다. 이 이슈들의 시각은 seed를 실행한 시각입니다.
 */
export function addCliActivity(bd: RunBd): void {
  const legalReview = bd(
    "gate",
    "create",
    "--type=human",
    "--blocks",
    "acme-w2n.4",
    "--title",
    "Legal review of the privacy policy",
    "--reason",
    "Legal has to approve the final wording before we publish it.",
    "--actor",
    "sam",
    "--json",
  );
  // Needs human 화면은 같은 초에 만든 gate를 무작위 hash인 ID 순서로 놓으므로, 다음 gate를 늦은 초에 만들어 맨 위에 둡니다.
  waitForNextCreatedSecond(bd, (JSON.parse(legalReview) as { id: string }).id);
  bd(
    "gate",
    "create",
    "--type=human",
    "--blocks",
    "acme-p8d.6",
    "--title",
    "Go/no-go call for the launch",
    "--reason",
    "Sam makes the final go/no-go call after the checklist is signed off.",
    "--actor",
    "jordan",
  );
  bd("supersede", "acme-b3s", "--with", "acme-t8w", "--actor", "sam");

  const banner = createIssue(bd, "sam", "Add a cookie consent banner for EU visitors", [
    "--type=feature",
    "--parent=acme-w2n",
    "--labels=frontend,legal",
    "--description=Ask before loading analytics scripts. Remember the choice for a year.",
  ]);
  bd("update", banner, "--claim", "--actor", "maya");
  bd(
    "comments",
    "add",
    banner,
    "Analytics scripts now wait for consent. Tested in Chrome, Safari, and Firefox with a German locale.",
    "--actor",
    "maya",
  );
  bd("close", banner, "--reason", "Merged in #436.", "--actor", "maya");

  const translation = createIssue(bd, "sam", "Translate the checkout page into German and French", [
    "--type=task",
    "--parent=acme-k3v",
    "--labels=frontend",
    "--description=Translate the checkout copy and error messages. Prices and dates already follow the browser locale.",
  ]);
  bd("update", translation, "--claim", "--actor", "nina");
  bd(
    "comments",
    "add",
    translation,
    "Strings are extracted. The German translation is in review, and French comes back from the vendor on Thursday.",
    "--actor",
    "nina",
  );
}

/**
 * id 이슈가 만들어진 시각으로 기록된 초보다 늦은 초가 될 때까지 기다립니다.
 * bd는 만든 시각을 초 단위로 반올림해 저장하므로, 저장된 초에서 1초가 지난 뒤에 만든 이슈는 반드시 늦은 초로 기록됩니다.
 */
function waitForNextCreatedSecond(bd: RunBd, id: string): void {
  const [issue] = JSON.parse(bd("show", id, "--json")) as { created_at: string }[];
  const remaining = Date.parse(issue!.created_at) + 1000 - Date.now();
  // RunBd가 동기 함수라서 seed 흐름도 동기이므로, event loop를 거치지 않고 멈추는 Atomics.wait로 기다립니다.
  if (remaining > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, remaining);
}

function createIssue(bd: RunBd, actor: string, title: string, args: string[]): string {
  return bd("create", title, ...args, "--actor", actor, "--silent").trim();
}
