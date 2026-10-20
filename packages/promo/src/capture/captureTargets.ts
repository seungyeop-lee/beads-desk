import type { Locator, Page } from "playwright";

/** 녹화하는 동안 장면이 쓰는 동작입니다. `pause` 말고는 모두 포인터가 대상으로 옮겨 가는 모습을 녹화에 남깁니다. */
export type Scene = {
  page: Page;
  /** 보는 사람이 화면을 읽을 수 있도록 기다립니다. */
  pause(ms: number): Promise<void>;
  /** 포인터를 `target`으로 옮겨 잠시 멈춘 뒤 클릭합니다. */
  click(target: Locator): Promise<void>;
  /** `target`을 클릭한 뒤, 사람이 입력하는 속도로 `text`를 한 글자씩 입력합니다. */
  type(target: Locator, text: string): Promise<void>;
  /** 포인터를 `over` 위로 옮긴 뒤 마우스 휠로 천천히 스크롤합니다. 한 번에 옮기면 녹화에서 화면이 순간 이동한 것처럼 보입니다. */
  scroll(deltaY: number, over: Locator): Promise<void>;
  /** 포인터를 옮기지 않고 키를 누릅니다. */
  press(key: string): Promise<void>;
};

/** 열 주소와, 그 주소의 데모 데이터를 다 불러왔다고 판단할 때 화면에 보여야 하는 문구입니다. */
export type View = {
  path: string;
  shows: string[];
  /** 스크린샷의 viewport 높이(CSS 픽셀)입니다. 화면 내용이 기본 높이에 다 들어가지 않거나 남을 때만 줍니다. */
  height?: number;
  /** 주소를 열기 전에 page를 준비합니다. 화면이 처음 그릴 때 읽는 browser 저장소 값을 미리 넣을 때 씁니다. */
  prepare?(page: Page): Promise<void>;
  /** 화면을 다 불러온 뒤, 스크린샷을 찍거나 녹화를 시작하기 전에 구도를 맞춥니다. */
  frame?(page: Page): Promise<void>;
};

export type CaptureTarget = {
  /** README 스크린샷과 녹화 파일의 이름(`<name>.png`, `<name>.webm`)입니다. */
  name: string;
  /** README에 넣을 스크린샷의 화면입니다. 녹화만 하는 대상은 비워 둡니다. */
  screenshot?: View;
  /**
   * 소개 영상에 쓰는 녹화를 시작하는 화면과, 녹화하는 동안의 동작입니다. 스크린샷만 찍는 대상은 비워 둡니다.
   * 장면 안에서는 주소로 이동하지 않고 클릭으로 화면을 바꿉니다.
   */
  recording?: View & { play(scene: Scene): Promise<void> };
};

const NOW: View = { path: "/focus", shows: ["Checkout and billing ready for launch", "Flow"] };
const DECISIONS: View = { path: "/decisions", shows: ["Sign in with passwordless magic links"] };
const HYGIENE: View = {
  path: "/hygiene",
  shows: [
    "Pick a status page provider for incident updates",
    "Magic link emails land in the spam folder",
    "Replace placeholder screenshots on the landing page",
    "Private beta with the first 50 customers",
    "Add the Apple Pay domain verification file (acme-k3v.3)",
  ],
};
/**
 * 활동 화면은 이 브라우저가 그 workspace의 활동 화면을 마지막으로 연 시각을 localStorage에서 읽어 구분선을 그립니다.
 * capture의 browser context는 처음 쓰는 것이라 그 값이 없으므로, 한 시간 전에 본 것으로 넣어 seed가 마지막에 남긴 기록 아래에 구분선이 보이게 합니다.
 */
const ACTIVITY: View = {
  path: "/activity",
  shows: ["Translate the checkout page into German and French", "Seen on your last visit"],
  async prepare(page) {
    await page.addInitScript(() => {
      const [, prefix, workspace] = location.pathname.split("/");
      if (prefix !== "w" || !workspace) return;
      const key = `beads-desk.activity-seen.${decodeURIComponent(workspace)}`;
      localStorage.setItem(key, String(Date.now() - 60 * 60 * 1000));
    });
  },
};
const BOARD: View = {
  path: "/board",
  shows: [
    "Build the checkout page with card and Apple Pay",
    "Add a cookie consent banner for EU visitors",
  ],
};
const CHECKOUT_ISSUE = "acme-k3v.3";
const CHECKOUT_TITLE = "Build the checkout page with card and Apple Pay";

/**
 * 단계와 human gate까지 보이는 epic의 View order 그래프입니다.
 * 그래프는 가로로 길어서 canvas 너비에 맞춰 줄어들고, 높이가 900이면 위아래가 크게 빕니다.
 * viewport를 낮추고 그래프를 canvas 위쪽으로 끌어 올려, 아래쪽 minimap과 겹치지 않게 합니다.
 */
const GRAPH: View = {
  path: "/epics?epic=acme-p8d",
  shows: ["Stage 5", "Go/no-go call for the launch"],
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
};

/** 머리글의 화면 이동 링크입니다. 장면은 이 링크를 클릭해 다음 화면으로 넘어갑니다. */
function navLink(page: Page, name: string): Locator {
  return page.getByRole("navigation", { name: "Screens" }).getByRole("link", { name });
}

/** 이슈 상세입니다. 화면 위에 열면 dialog이고, 그래프 위에 열면 region입니다. */
function issueDetail(page: Page, id: string): Locator {
  const name = `Issue ${id}`;
  return page.getByRole("dialog", { name }).or(page.getByRole("region", { name }));
}

/**
 * README와 소개 영상이 보여 주는 특장점마다 캡처할 화면입니다. 스크린샷을 모두 찍은 뒤, 이 순서대로 녹화합니다.
 * gate 응답 녹화는 데모 workspace의 이슈를 바꾸므로 맨 뒤에 녹화해, 다른 녹화의 Needs human 개수가 응답하기 전의 값으로 남게 합니다.
 */
export const CAPTURE_TARGETS: CaptureTarget[] = [
  { name: "now", screenshot: NOW },
  {
    // 응답을 입력한 채로 찍고 보내지 않으므로, 데모 workspace의 이슈는 바뀌지 않습니다.
    name: "needs-human",
    screenshot: {
      path: "/human",
      shows: ["Go/no-go call for the launch", "Legal review of the privacy policy"],
      async frame(page) {
        await page
          .getByRole("region", { name: "Human gates" })
          .getByRole("button", { name: /Go\/no-go call for the launch/ })
          .click();
        const gate = page.getByRole("region", { name: "Go/no-go call for the launch" });
        await gate
          .getByRole("textbox", { name: "Response", exact: true })
          .fill("Go. The checklist is signed off and support is staffed for launch day.");
        await gate.getByRole("button", { name: "Respond and close" }).waitFor();
        await page.mouse.move(0, 0);
      },
    },
  },
  { name: "activity", screenshot: ACTIVITY },
  { name: "graph", screenshot: GRAPH },
  {
    name: "attachments",
    screenshot: {
      path: `/issues?issue=${CHECKOUT_ISSUE}`,
      shows: ["Staging check", "Test payment with a Stripe test card on staging."],
      async frame(page) {
        // 그림 전체와 그 아래 결제 화면 스크린샷이 함께 보이도록, 그림을 상세의 맨 위로 올립니다.
        await issueDetail(page, CHECKOUT_ISSUE)
          .getByRole("button", { name: "Enlarge diagram", exact: true })
          .evaluate((element) => element.scrollIntoView({ block: "start" }));
        await issueDetail(page, CHECKOUT_ISSUE)
          .getByRole("img", { name: "Checkout page on staging" })
          .evaluate((image: HTMLImageElement) => image.decode());
      },
    },
  },
  { name: "hygiene", screenshot: HYGIENE },
  {
    // 결제 epic의 View order에서 진행 중인 결제 화면 이슈를 열고, 설명의 Mermaid 그림, 스크린샷, 녹화를 차례로 봅니다.
    name: "plan-and-attachments",
    recording: {
      path: "/epics?epic=acme-k3v",
      shows: ["Stage 4", CHECKOUT_TITLE],
      async play({ page, pause, click, scroll, press }) {
        await pause(1500);
        await click(
          page
            .getByRole("region", { name: "Dependency graph" })
            .getByRole("link", { name: new RegExp(CHECKOUT_TITLE) }),
        );
        const detail = issueDetail(page, CHECKOUT_ISSUE);
        const diagram = detail.getByRole("button", { name: "Enlarge diagram", exact: true });
        await diagram.waitFor();
        // 그림을 누르면 상세가 그림까지 스크롤하므로, 상세를 다 그린 뒤 2초 넘게 멈춰 두어 장면을 그 사이에서 나눌 수 있게 합니다.
        await pause(2000);
        await click(diagram);
        await page.getByRole("dialog", { name: "Enlarged diagram", exact: true }).waitFor();
        await pause(1500);
        await press("Escape");
        await pause(500);
        // 제목이 상세의 머리글 바로 아래에 오도록 스크롤해, 결제 화면 스크린샷과 녹화 링크가 함께 보이게 합니다.
        // 포인터는 보이는 그림 위에 둡니다. 화면 밖의 제목 위로 옮기면 Playwright가 먼저 제목까지 한 번에 스크롤합니다.
        const heading = (await detail.getByText("Staging check", { exact: true }).boundingBox())!;
        await scroll(heading.y - 160, diagram);
        await pause(1200);
        await click(detail.getByRole("link", { name: "Recording of the test payment" }));
        await page.locator("video").waitFor();
        await pause(3500);
      },
    },
  },
  {
    // 대체한 결정의 상세에서 Linked issues의 Supersedes 링크로 대체된 이전 결정을 옆 패널에 엽니다.
    name: "decisions",
    screenshot: DECISIONS,
    recording: {
      ...DECISIONS,
      async play({ page, pause, click }) {
        await pause(1000);
        await click(page.getByRole("link", { name: "Sign in with passwordless magic links" }));
        const detail = issueDetail(page, "acme-t8w");
        await detail
          .getByText("Support tickets from the beta were mostly password resets.")
          .waitFor();
        await pause(1300);
        await click(detail.getByRole("link", { name: /Sign in with email and password/ }));
        await page
          .getByRole("region", { name: "Side panel for issue acme-b3s" })
          .getByText("Start with the most familiar sign-in flow")
          .waitFor();
        await pause(1800);
      },
    },
  },
  {
    // Legal review gate는 acme-w2n.4만 막으므로, 응답하면 그 카드만 Blocked에서 Ready로 옮겨 갑니다.
    name: "respond-to-gate",
    recording: {
      ...BOARD,
      async play({ page, pause, click, type }) {
        await pause(1200);
        await click(navLink(page, "Needs human"));
        const card = page
          .getByRole("region", { name: "Human gates" })
          .getByRole("button", { name: /Legal review of the privacy policy/ });
        await card.waitFor();
        await pause(500);
        await click(card);
        const gate = page.getByRole("region", { name: "Legal review of the privacy policy" });
        await gate.waitFor();
        await pause(600);
        await type(
          gate.getByRole("textbox", { name: "Response", exact: true }),
          "Approved by legal.",
        );
        await pause(300);
        await click(gate.getByRole("button", { name: "Respond and close" }));
        await gate.waitFor({ state: "detached" });
        await pause(1200);
        await click(navLink(page, "Board"));
        await page
          .getByRole("region", { name: "Ready", exact: true })
          .getByText("Publish the updated privacy policy and terms of service")
          .waitFor();
        // 보드는 카드를 먼저 그리고 human gate 제목을 나중에 불러오므로, 다른 카드의 막힘 표시까지 다 그릴 때까지 기다립니다.
        await page
          .getByRole("region", { name: "Blocked", exact: true })
          .getByText("Awaiting human")
          .waitFor();
        await pause(3000);
      },
    },
  },
];
