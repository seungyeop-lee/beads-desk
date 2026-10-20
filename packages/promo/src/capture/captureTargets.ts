import type { Locator, Page } from "playwright";

/**
 * 녹화하는 동안 장면이 쓰는 동작입니다. `pause`와 `mark` 말고는 모두 포인터가 대상으로 옮겨 가는 모습을 녹화에 남깁니다.
 * `name`을 받는 동작은 그 이름과 녹화 시각을 `<녹화 이름>.events.json`에 남기고, 소개 영상은 이 이름으로 자막, 확대, 구간의 시각을 정합니다.
 */
export type Scene = {
  page: Page;
  /** 보는 사람이 화면을 읽을 수 있도록 기다립니다. */
  pause(ms: number): Promise<void>;
  /** 포인터를 `target`으로 옮겨 잠시 멈춘 뒤 클릭합니다. 클릭한 시각을 남깁니다. */
  click(target: Locator, name: string): Promise<void>;
  /**
   * 포인터를 `over` 위로 옮긴 뒤 마우스 휠로 천천히 스크롤하고, 스크롤을 마친 시각을 남깁니다.
   * 한 번에 옮기면 녹화에서 화면이 순간 이동한 것처럼 보입니다.
   */
  scroll(deltaY: number, over: Locator, name: string): Promise<void>;
  /** 동작 없이 지금 시각을 남깁니다. 클릭한 뒤 화면을 다 그린 순간처럼, 영상이 기준으로 삼을 시각에 씁니다. */
  mark(name: string): void;
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
const CHECKOUT_EPIC_TITLE = "Checkout and billing ready for launch";
const CHECKOUT_ISSUE = "acme-k3v.3";
const CHECKOUT_TITLE = "Build the checkout page with card and Apple Pay";
const STRIPE_DECISION = "Use Stripe as the only payment provider at launch";
const PAYPAL_DECISION = "Offer PayPal alongside cards at launch";

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

/** 에픽 화면에서 제목이 `title`인 에픽 카드의 머리 줄입니다. 순서 보기 링크가 이 줄에 있습니다. */
function epicHeader(page: Page, title: string): Locator {
  return page
    .locator("header")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

/** 이슈 상세입니다. 화면 위에 열면 dialog이고, 그래프 위에 열면 region입니다. */
function issueDetail(page: Page, id: string): Locator {
  const name = `Issue ${id}`;
  return page.getByRole("dialog", { name }).or(page.getByRole("region", { name }));
}

/** README가 보여 주는 특장점마다 캡처할 화면과 소개 영상의 녹화입니다. 스크린샷을 모두 찍은 뒤, 이 순서대로 녹화합니다. */
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
  { name: "decisions", screenshot: DECISIONS },
  {
    // 결제 epic 하나를 따라가며 순서 보기, 결제 화면 이슈의 Mermaid 그림과 스크린샷, 결제와 같은 주제의 결정과 그 결정이 대체한 이전 결정을 봅니다.
    // 장면은 포인터의 클릭으로 이어지도록, dialog도 Escape가 아니라 닫기 버튼을 눌러 닫습니다.
    // 이슈에 붙인 녹화 링크는 누르지 않습니다. 탭이 브라우저의 동영상 화면으로 넘어가 beads-desk 밖으로 나가기 때문입니다.
    // pause 길이는 영상의 자막을 읽고 확대 영역이 옮겨 갈 시간이므로, 바꾸면 introTimeline.ts의 TOUR도 함께 확인합니다.
    name: "tour",
    recording: {
      path: "/epics",
      shows: [CHECKOUT_EPIC_TITLE, "View order"],
      // 에픽 화면은 첫 에픽의 하위 이슈를 펼쳐 두어 결제 epic이 화면 아래로 밀려나므로, 접어서 열린 에픽 카드가 모두 보이게 합니다.
      async frame(page) {
        await page.getByRole("button", { name: "Collapse child issues of acme-p8d" }).click();
      },
      async play({ page, pause, click, scroll, mark }) {
        await pause(2200);
        await click(
          epicHeader(page, CHECKOUT_EPIC_TITLE).getByRole("link", { name: "View order" }),
          "open-plan",
        );
        const plan = page.getByRole("dialog", { name: `${CHECKOUT_EPIC_TITLE} · Order` });
        const graph = plan.getByRole("region", { name: "Dependency graph" });
        await graph.getByText("Stage 4", { exact: false }).waitFor();
        mark("plan-shown");
        await pause(2200);

        await click(graph.getByRole("link", { name: new RegExp(CHECKOUT_TITLE) }), "open-checkout");
        const detail = issueDetail(page, CHECKOUT_ISSUE);
        const diagram = detail.getByRole("button", { name: "Enlarge diagram", exact: true });
        await diagram.waitFor();
        mark("checkout-shown");
        await pause(2700);
        await click(diagram, "enlarge-diagram");
        const enlarged = page.getByRole("dialog", { name: "Enlarged diagram", exact: true });
        await enlarged.waitFor();
        await pause(1500);
        // dialog 바깥 배경도 이름이 Close인 버튼이므로, 머리글의 닫기 버튼을 고릅니다.
        await click(
          enlarged.getByRole("banner").getByRole("button", { name: "Close", exact: true }),
          "close-diagram",
        );
        await enlarged.waitFor({ state: "hidden" });
        await pause(600);
        // 녹화 링크의 아래 끝이 상세 아래쪽(y 676)에 오도록 스크롤해, 그 위의 Staging check 제목과 결제 화면 스크린샷이 함께 보이게 합니다.
        const link = (await detail
          .getByRole("link", { name: "Recording of the test payment" })
          .boundingBox())!;
        await scroll(link.y + link.height - 676, diagram, "scroll-to-screenshot");
        await pause(1700);

        // 순서 보기 dialog의 머리글 닫기 버튼입니다. 상세의 닫기 버튼보다 앞에 있습니다.
        await click(plan.getByRole("link", { name: "Close", exact: true }).first(), "close-plan");
        await plan.waitFor({ state: "hidden" });
        await pause(300);
        await click(navLink(page, "Decisions"), "open-decisions");
        const stripe = page.getByRole("link", { name: STRIPE_DECISION });
        await stripe.waitFor();
        mark("decisions-shown");
        await pause(2400);
        await click(stripe, "open-decision");
        const decision = issueDetail(page, "acme-n5e");
        await decision.getByText("Stripe covers cards").waitFor();
        mark("decision-shown");
        await pause(1500);
        await click(
          decision.getByRole("link", { name: new RegExp(PAYPAL_DECISION) }),
          "open-replaced",
        );
        await page
          .getByRole("region", { name: "Side panel for issue acme-d2p" })
          .getByText("Offer PayPal next to card payments", { exact: false })
          .waitFor();
        mark("replaced-shown");
        await pause(2800);
      },
    },
  },
];
