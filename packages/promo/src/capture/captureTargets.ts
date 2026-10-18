import type { Page } from "playwright";

/** 녹화하는 동안 장면이 쓰는 동작입니다. */
export type Scene = {
  page: Page;
  /** 보는 사람이 화면을 읽을 수 있도록 기다립니다. */
  pause(ms: number): Promise<void>;
  /** 마우스 휠로 천천히 스크롤합니다. 한 번에 옮기면 녹화에서 화면이 순간 이동한 것처럼 보입니다. */
  scroll(deltaY: number): Promise<void>;
  /**
   * 데모 workspace에서 bd를 실행하고, 그 결과로 `text`가 보드의 `column` 열에 나타날 때까지 기다립니다.
   * 실행한 명령과 시각은 captureLog.json에 남습니다.
   */
  bd(args: string[], shown: { column: string; text: string }): Promise<void>;
};

/** 열 주소와, 그 주소의 데모 데이터를 다 불러왔다고 판단할 때 화면에 보여야 하는 문구입니다. */
export type View = { path: string; shows: string[] };

export type CaptureTarget = {
  /** README 스크린샷과 녹화 파일의 이름(`<name>.png`, `<name>.webm`)입니다. */
  name: string;
  /** README에 넣을 스크린샷의 화면입니다. 녹화만 하는 대상은 비워 둡니다. */
  screenshot?: View;
  /** 녹화를 시작하는 화면과, 녹화하는 동안의 동작입니다. */
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
const BOARD: View = {
  path: "/board",
  shows: [
    "Build the checkout page with card and Apple Pay",
    "Add a cookie consent banner for EU visitors",
  ],
};

/**
 * README와 소개 영상이 보여 주는 특장점마다 캡처할 화면입니다. 이 순서대로 캡처합니다.
 * 실시간 반영 장면은 데모 workspace의 이슈를 바꾸므로, 다른 화면이 바뀐 데이터를 보이지 않도록 맨 뒤에 둡니다.
 */
export const CAPTURE_TARGETS: CaptureTarget[] = [
  {
    name: "now",
    screenshot: NOW,
    recording: {
      ...NOW,
      async play({ pause, scroll }) {
        await pause(2500);
        await scroll(450);
        await pause(2500);
      },
    },
  },
  {
    name: "needs-human",
    screenshot: NEEDS_HUMAN,
    recording: {
      ...NEEDS_HUMAN,
      async play({ page, pause }) {
        await pause(2500);
        await page.getByText("Offer annual billing at launch, or wait until after beta?").click();
        await page.getByText("Annual plans bring cash up front").waitFor();
        await pause(3000);
      },
    },
  },
  {
    name: "decisions",
    screenshot: DECISIONS,
    recording: {
      ...DECISIONS,
      async play({ page, pause }) {
        await pause(2500);
        await page.getByRole("link", { name: "Sign in with passwordless magic links" }).click();
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
      path: "/issues?issue=acme-k3v.3",
      shows: ["Single-page checkout using Stripe Elements.", "Linked issues"],
      async play({ page, pause, scroll }) {
        await pause(1500);
        await scroll(700);
        await pause(1000);
        await page
          .getByRole("link", { name: "acme-k3v.4 Send a receipt email after a successful payment" })
          .click();
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
    },
    recording: {
      path: "/epics",
      shows: [
        "Production infrastructure and launch day",
        "Set up a staging environment that mirrors production",
      ],
      async play({ page, pause }) {
        await pause(2000);
        await page.getByRole("link", { name: "View order" }).first().click();
        await page.getByText("Stage 5", { exact: true }).waitFor();
        await pause(3500);
      },
    },
  },
  {
    name: "blocks-graph",
    recording: {
      path: "/issues?issue=acme-p8d.5",
      shows: ["Walk through the checklist with engineering, support, and marketing"],
      async play({ page, pause }) {
        await pause(1500);
        await page.getByRole("link", { name: "Blocks graph" }).click();
        await page.getByText("· Blocks chain", { exact: true }).waitFor();
        await pause(3500);
      },
    },
  },
  {
    name: "board",
    screenshot: BOARD,
    recording: {
      ...BOARD,
      async play({ pause }) {
        await pause(4000);
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
        await bd(["close", "acme-7qx", "--reason", "Sending domain verified", "--actor", "leo"], {
          column: "Ready",
          text: "Welcome email sequence for new signups",
        });
        await pause(3000);
      },
    },
  },
];
