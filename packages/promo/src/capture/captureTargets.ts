import type { Locator, Page } from "playwright";

/** 녹화하는 동안 장면이 쓰는 동작입니다. `click`과 `scroll`은 포인터가 대상으로 옮겨 가는 모습을 녹화에 남깁니다. */
export type Scene = {
  page: Page;
  /** 보는 사람이 화면을 읽을 수 있도록 기다립니다. */
  pause(ms: number): Promise<void>;
  /** 포인터를 `target`으로 옮겨 잠시 멈춘 뒤 클릭합니다. */
  click(target: Locator): Promise<void>;
  /** 포인터를 `over` 위로 옮긴 뒤 마우스 휠로 천천히 스크롤합니다. 한 번에 옮기면 녹화에서 화면이 순간 이동한 것처럼 보입니다. */
  scroll(deltaY: number, over: Locator): Promise<void>;
  /**
   * 데모 workspace에서 bd를 실행하고, 그 결과로 `text`가 보드의 `column` 열에 나타날 때까지 기다립니다.
   * 실행한 명령과 시각은 captureLog.json에 남습니다.
   * `actor`를 주면 그 이름으로 실행합니다. 기록에 남는 명령이 사람이 입력하는 모양이 되도록 `--actor` 대신 환경 변수로 넘깁니다.
   */
  bd(args: string[], shown: { column: string; text: string }, actor?: string): Promise<void>;
};

/** 열 주소와, 그 주소의 데모 데이터를 다 불러왔다고 판단할 때 화면에 보여야 하는 문구입니다. */
export type View = { path: string; shows: string[] };

export type Screenshot = View & {
  /** viewport 높이(CSS 픽셀)입니다. 화면 내용이 기본 높이에 다 들어가지 않거나 남을 때만 줍니다. */
  height?: number;
  /** 화면을 다 불러온 뒤, 찍기 직전에 구도를 맞춥니다. */
  frame?(page: Page): Promise<void>;
};

export type CaptureTarget = {
  /** README 스크린샷과 녹화 파일의 이름(`<name>.png`, `<name>.webm`)입니다. */
  name: string;
  /** README에 넣을 스크린샷의 화면입니다. 녹화만 하는 대상은 비워 둡니다. */
  screenshot?: Screenshot;
  /** 녹화를 시작하는 화면과, 녹화하는 동안의 동작입니다. 장면 안에서는 주소로 이동하지 않고 클릭으로 화면을 바꿉니다. */
  recording: View & { play(scene: Scene): Promise<void> };
};

const NOW: View = { path: "/focus", shows: ["Checkout and billing ready for launch", "Flow"] };
const NEEDS_HUMAN: View = {
  path: "/human",
  shows: [
    "Go/no-go call for the launch",
    "Offer annual billing at launch, or wait until after beta?",
  ],
};
const DECISIONS: View = { path: "/decisions", shows: ["Sign in with passwordless magic links"] };
const ISSUES: View = {
  path: "/issues",
  shows: ["Build the checkout page with card and Apple Pay"],
};
const EPICS: View = {
  path: "/epics",
  shows: [
    "Production infrastructure and launch day",
    "Set up a staging environment that mirrors production",
  ],
};
const BOARD: View = {
  path: "/board",
  shows: [
    "Build the checkout page with card and Apple Pay",
    "Add a cookie consent banner for EU visitors",
  ],
};

/** 머리글의 화면 이동 링크입니다. 장면은 이 링크를 클릭해 다음 화면으로 넘어갑니다. */
function navLink(page: Page, name: string): Locator {
  return page.getByRole("navigation", { name: "Screens" }).getByRole("link", { name });
}

/**
 * README와 소개 영상이 보여 주는 특장점마다 캡처할 화면입니다. 이 순서대로 캡처합니다.
 * 각 장면은 앞 장면이 머문 화면에서 시작하므로, 녹화를 이어 붙이면 한 사람이 화면을 차례로 둘러보는 흐름이 됩니다.
 * 실시간 반영 장면은 데모 workspace의 이슈를 바꾸므로, 다른 화면이 바뀐 데이터를 보이지 않도록 맨 뒤에 둡니다.
 */
export const CAPTURE_TARGETS: CaptureTarget[] = [
  {
    name: "now",
    screenshot: NOW,
    recording: {
      ...NOW,
      async play({ page, pause, scroll }) {
        await pause(2000);
        await scroll(
          450,
          page
            .getByRole("region", { name: "In progress", exact: true })
            .getByRole("link", { name: /Write the launch day runbook/ }),
        );
        await pause(2500);
      },
    },
  },
  {
    name: "needs-human",
    screenshot: NEEDS_HUMAN,
    recording: {
      ...NOW,
      async play({ page, pause, click }) {
        await pause(1000);
        await click(navLink(page, "Needs human"));
        await page.getByText("Go/no-go call for the launch").first().waitFor();
        await pause(2000);
        await click(page.getByText("Offer annual billing at launch, or wait until after beta?"));
        await page.getByText("Annual plans bring cash up front").waitFor();
        await pause(3000);
      },
    },
  },
  {
    name: "decisions",
    screenshot: DECISIONS,
    recording: {
      ...NEEDS_HUMAN,
      async play({ page, pause, click }) {
        await pause(1000);
        await click(navLink(page, "Decisions"));
        const decision = page.getByRole("link", { name: "Sign in with passwordless magic links" });
        await decision.waitFor();
        await pause(1500);
        await click(decision);
        await page
          .getByText("Support tickets from the beta were mostly password resets.")
          .waitFor();
        await pause(3000);
      },
    },
  },
  {
    name: "linked-issues",
    screenshot: {
      path: "/issues?issue=acme-k3v.3&side=acme-k3v.4",
      shows: [
        "Single-page checkout using Stripe Elements.",
        "Send a receipt with the plan, amount, tax",
      ],
    },
    recording: {
      ...DECISIONS,
      async play({ page, pause, click, scroll }) {
        await pause(1000);
        await click(navLink(page, "Issues"));
        const issue = page.getByRole("link", {
          name: "Build the checkout page with card and Apple Pay",
          exact: true,
        });
        await issue.waitFor();
        await pause(1500);
        await click(issue);
        const description = page.getByText("Single-page checkout using Stripe Elements.");
        await description.waitFor();
        await pause(1500);
        await scroll(700, description);
        await pause(1000);
        await click(
          page.getByRole("link", {
            name: "acme-k3v.4 Send a receipt email after a successful payment",
          }),
        );
        await page.getByText("Send a receipt with the plan, amount, tax").waitFor();
        await pause(3000);
      },
    },
  },
  {
    // README의 그래프 스크린샷은 단계와 human gate까지 보이는 epic의 View order로 찍고, Blocks graph는 녹화로만 보여 줍니다.
    name: "graph",
    screenshot: {
      path: "/epics?epic=acme-p8d",
      shows: ["Stage 5", "Go/no-go call for the launch"],
      // 그래프는 가로로 길어서 canvas 너비에 맞춰 줄어들고, 높이가 900이면 위아래가 크게 빕니다.
      // viewport를 낮추고 그래프를 canvas 위쪽으로 끌어 올려, 아래쪽 minimap과 겹치지 않게 합니다.
      height: 720,
      async frame(page) {
        const canvas = page.getByRole("region", { name: "Dependency graph" });
        const area = (await canvas.boundingBox())!;
        const firstStage = (await canvas.getByText("Stage 1", { exact: false }).boundingBox())!;
        // 첫 단계 이름이 canvas 왼쪽 여백과 같은 거리만큼 위쪽 테두리에서 떨어지도록, 빈 곳을 끌어 그래프를 옮깁니다.
        const margin = firstStage.x - area.x;
        const from = { x: area.x + area.width / 2, y: area.y + margin / 2 };
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.move(from.x, from.y + area.y + margin - firstStage.y, { steps: 10 });
        await page.mouse.up();
        // 포인터가 node 위에 남아 hover 표시가 찍히지 않도록 canvas 밖으로 뺍니다.
        await page.mouse.move(0, 0);
      },
    },
    recording: {
      ...ISSUES,
      async play({ page, pause, click }) {
        await pause(1000);
        await click(navLink(page, "Epics"));
        const viewOrder = page.getByRole("link", { name: "View order" }).first();
        await page.getByText("Production infrastructure and launch day").waitFor();
        await pause(2000);
        await click(viewOrder);
        await page.getByText("Stage 5", { exact: true }).waitFor();
        await pause(3500);
      },
    },
  },
  {
    name: "blocks-graph",
    recording: {
      ...EPICS,
      async play({ page, pause, click }) {
        await pause(1500);
        await click(
          page.getByRole("link", { name: "Sign off the go-live checklist", exact: true }),
        );
        const blocksGraph = page.getByRole("link", { name: "Blocks graph" });
        await blocksGraph.waitFor();
        await pause(2000);
        await click(blocksGraph);
        await page.getByText("· Blocks chain", { exact: true }).waitFor();
        await pause(3500);
      },
    },
  },
  {
    name: "board",
    // Blocked 열의 카드가 기본 높이(900)에서는 끝까지 보이지 않으므로, 모든 열의 카드가 다 보이는 높이로 찍습니다.
    screenshot: { ...BOARD, height: 1000 },
    recording: {
      ...EPICS,
      async play({ page, pause, click, scroll }) {
        await pause(1000);
        await click(navLink(page, "Board"));
        const blocked = page.getByRole("region", { name: "Blocked", exact: true });
        await blocked.getByText("Sign off the go-live checklist").waitFor();
        await pause(2500);
        // 900 높이에서는 Blocked 열의 마지막 카드가 가려지므로, 열을 스크롤해 끝까지 보여 줍니다.
        await scroll(
          400,
          blocked.getByRole("link", { name: /^End-to-end tests for the checkout flow/ }),
        );
        await pause(2500);
      },
    },
  },
  {
    name: "live-updates",
    recording: {
      ...BOARD,
      async play({ pause, bd }) {
        await pause(2000);
        await bd(["update", "acme-k3v.6", "--claim"], {
          column: "In progress",
          text: "Show a clear message when a card is declined",
        });
        await pause(2500);
        // acme-7qx를 닫으면 그 이슈만 기다리던 acme-w2n.5가 Blocked에서 Ready로 옮겨 갑니다.
        // bd는 다른 사람이 맡은 이슈를 닫지 않으므로, acme-7qx를 맡은 leo로 실행합니다.
        await bd(
          ["close", "acme-7qx", "--reason", "Sending domain verified"],
          { column: "Ready", text: "Welcome email sequence for new signups" },
          "leo",
        );
        await pause(3000);
      },
    },
  },
];
