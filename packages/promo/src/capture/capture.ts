import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright";
import { isolatedBdEnv } from "../seed/isolatedBdEnv.ts";
import { startAppServer } from "./appServer.ts";
import { RECORDING_SIZE } from "../video/introTimeline.ts";
import { CAPTURE_TARGETS, type CaptureTarget, type View } from "./captureTargets.ts";

/** README가 참조하는 스크린샷입니다. 저장소에 commit합니다. */
const SCREENSHOT_DIR = fileURLToPath(new URL("../../../../docs/screenshots/", import.meta.url));
/** 소개 영상의 원본 녹화입니다. 저장소에 넣지 않습니다. */
const RECORDING_DIR = fileURLToPath(new URL("../../recordings/", import.meta.url));
const SEED_SCRIPT = fileURLToPath(new URL("../seed/seed.ts", import.meta.url));
/** 화면 머리글에 workspace 디렉터리 이름이 보이므로, 새로 만드는 데모 workspace는 이 이름의 디렉터리에 둡니다. */
const DEMO_DIRECTORY_NAME = "acme-web";
/** README 스크린샷의 viewport입니다. 녹화는 소개 영상에 맞춘 RECORDING_SIZE로 합니다. */
const SCREENSHOT_VIEWPORT = { width: 1440, height: 900 };
const DEVICE_SCALE_FACTOR = 2;
/** 데모 데이터를 불러온 뒤 차트 animation과 글꼴 적용이 끝나기를 기다리는 시간입니다. */
const SETTLE_MS = 1500;
/**
 * 녹화에서 포인터가 대상으로 옮겨 가는 시간입니다. 이 시간이 지나야 실제 마우스가 옮겨 가서 대상에 hover 표시가 생깁니다.
 * Playwright는 이 시간의 60%와 400ms 가운데 짧은 쪽 동안 포인터를 곡선으로 옮기고, 남은 시간에는 멈춰 둡니다.
 */
const POINTER_MOVE_MS = 550;
/** 포인터가 대상에 멈춘 뒤 클릭하기까지의 시간입니다. 클릭 지점 표시가 이 시간 동안 흐려지다가 클릭할 때 사라집니다. */
const POINTER_PRESS_MS = 350;
/** 클릭 지점 표시입니다. 화면을 가리지 않도록 옅은 원으로 둡니다. */
const PRESS_MARK =
  "width: 28px; height: 28px; border-radius: 50%; background: rgba(28, 25, 23, 0.1); box-shadow: 0 0 0 1.5px rgba(28, 25, 23, 0.3)";
/** 장면을 시작할 때 포인터를 두는 곳입니다. 어느 화면에서나 제목 줄 오른쪽의 빈 곳이라 hover 표시가 생기지 않습니다. */
const POINTER_REST = { x: 900, y: 90 };
/** 휠 스크롤을 나누는 횟수와, 나눈 휠 입력 사이의 간격입니다. */
const WHEEL_STEPS = 20;
const WHEEL_STEP_MS = 25;
/** 한 글자를 입력하는 간격입니다. */
const TYPE_KEY_MS = 40;
const { values } = parseArgs({ options: { workspace: { type: "string" } } });

const home = mkdtempSync(join(tmpdir(), "beads-desk-promo-home-"));
const scratch = values.workspace
  ? undefined
  : realpathSync(mkdtempSync(join(tmpdir(), "beads-desk-promo-capture-")));
try {
  const workspace = scratch ? seedDemoWorkspace(scratch) : existingWorkspace(values.workspace!);
  const server = await startAppServer(workspace, isolatedBdEnv(home));
  try {
    await captureAll(server.url);
  } finally {
    await server.stop();
  }
} finally {
  rmSync(home, { recursive: true, force: true });
  if (scratch) rmSync(scratch, { recursive: true, force: true });
}
console.log(`스크린샷은 ${SCREENSHOT_DIR}에, 녹화는 ${RECORDING_DIR}에 저장했습니다.`);

function seedDemoWorkspace(parent: string): string {
  const workspace = join(parent, DEMO_DIRECTORY_NAME);
  execFileSync(process.execPath, [SEED_SCRIPT, workspace], { stdio: "inherit" });
  return workspace;
}

function existingWorkspace(path: string): string {
  // pnpm은 package 디렉터리에서 script를 실행하므로, 상대 경로는 명령을 입력한 디렉터리(INIT_CWD) 기준으로 풉니다.
  const workspace = realpathSync(resolve(process.env.INIT_CWD ?? process.cwd(), path));
  if (!existsSync(join(workspace, ".beads"))) {
    throw new Error(`${workspace}에 .beads가 없습니다. seed로 만든 데모 workspace를 줍니다.`);
  }
  return workspace;
}

async function captureAll(baseURL: string): Promise<void> {
  rmSync(RECORDING_DIR, { recursive: true, force: true });
  mkdirSync(RECORDING_DIR, { recursive: true });
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      baseURL,
      viewport: SCREENSHOT_VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      locale: "en-US",
      colorScheme: "light",
    });
    // 스크린샷과 녹화에 스크롤바가 찍히지 않게 CSS로 숨깁니다. Playwright의 기본 headless 실행도 스크롤바를 숨기지만,
    // dialog를 열 때 daisyUI가 거는 scrollbar-gutter 자리는 남겨 dialog를 연 장면에서만 뒤 화면 폭이 15px 줄어듭니다.
    // scrollbar-width: none은 그 자리도 남기지 않아 모든 장면이 같은 폭으로 찍힙니다.
    await context.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = "* { scrollbar-width: none; }";
        document.head.append(style);
      });
    });
    await context.addCookies([
      { name: "beads-desk-locale", value: "en", url: baseURL },
      { name: "beads-desk-theme", value: "light", url: baseURL },
    ]);
    // 녹화 가운데 데모 workspace의 이슈를 바꾸는 것이 있으므로, 스크린샷을 모두 먼저 찍습니다.
    for (const target of CAPTURE_TARGETS) {
      if (target.screenshot) await takeScreenshot(context, target.name, target.screenshot);
    }
    for (const target of CAPTURE_TARGETS) {
      if (!target.recording) continue;
      await record(context, target.name, target.recording);
      console.log(`${target.name} 화면을 녹화했습니다.`);
    }
  } finally {
    await browser.close();
  }
}

/** 녹화와 다른 page에서 찍으므로, 녹화용 포인터와 클릭 지점 표시가 스크린샷에 들어가지 않습니다. */
async function takeScreenshot(context: BrowserContext, name: string, shot: View): Promise<void> {
  const page = await open(context, shot, {
    ...SCREENSHOT_VIEWPORT,
    height: shot.height ?? SCREENSHOT_VIEWPORT.height,
  });
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`), animations: "disabled" });
  await page.close();
}

async function record(
  context: BrowserContext,
  name: string,
  recording: NonNullable<CaptureTarget["recording"]>,
): Promise<void> {
  const page = await open(context, recording, RECORDING_SIZE);
  // 포인터는 처음 나타날 때는 제자리에 그려지고, 그 뒤로는 앞 위치에서 다음 위치로 옮겨 가며 그려집니다.
  // 녹화를 시작하기 전에 쉬는 위치에 한 번 그려 두어, 첫 동작부터 포인터가 옮겨 가는 모습이 남게 합니다.
  const showPointer = (duration: number, point?: string) =>
    page.screencast.showActions({
      cursor: "pointer",
      duration,
      // 동작 이름 자막은 영상에 넣지 않습니다.
      style: { title: "display: none", point },
    });
  await showPointer(POINTER_MOVE_MS);
  await page.mouse.move(POINTER_REST.x, POINTER_REST.y);

  // screencast frame은 deviceScaleFactor와 관계없이 CSS 픽셀 크기로 옵니다.
  // 더 큰 size를 주면 화면이 확대되지 않고 왼쪽 위에 놓인 채 나머지가 회색으로 채워집니다.
  await page.screencast.start({
    path: join(RECORDING_DIR, `${name}.webm`),
    size: page.viewportSize()!,
  });

  async function click(element: Locator) {
    await showPointer(POINTER_MOVE_MS);
    await element.hover();
    await showPointer(POINTER_PRESS_MS, PRESS_MARK);
    await element.click();
  }

  await recording.play({
    page,
    pause: (ms) => page.waitForTimeout(ms),
    click,
    async type(element, text) {
      await click(element);
      // 키 입력은 showActions의 duration만큼 기다리지 않으므로, 입력 간격을 따로 줍니다.
      await page.keyboard.type(text, { delay: TYPE_KEY_MS });
    },
    async scroll(deltaY, over) {
      await showPointer(POINTER_MOVE_MS);
      await over.hover();
      // 포인터를 보이는 동안에는 휠 입력마다 showActions의 duration만큼 기다리므로, 그 시간을 휠 입력 간격으로 씁니다.
      await showPointer(WHEEL_STEP_MS);
      for (let step = 0; step < WHEEL_STEPS; step += 1) {
        await page.mouse.wheel(0, deltaY / WHEEL_STEPS);
      }
    },
    press: (key) => page.keyboard.press(key),
  });

  await page.screencast.stop();
  await page.close();
}

/** 화면을 열고 데모 데이터가 다 보일 때까지 기다립니다. */
async function open(
  context: BrowserContext,
  view: View,
  viewport: { width: number; height: number },
): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(view.path);
  for (const text of view.shows) {
    await page.getByText(text).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(SETTLE_MS);
  await view.frame?.(page);
  return page;
}
