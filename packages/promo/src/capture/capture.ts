import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium, type BrowserContext, type Locator, type Page } from "playwright";
import { isolatedBdEnv } from "../seed/isolatedBdEnv.ts";
import { startAppServer } from "./appServer.ts";
import { RECORDING_SIZE, type RecordingEvent } from "../video/introTimeline.ts";
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
/**
 * 휠 스크롤을 나누는 횟수와, 나눈 휠 입력 사이의 간격입니다.
 * 스크롤하는 동안은 GIF의 frame마다 화면 전체가 바뀌어 용량이 크게 늘므로, 움직임이 보이는 만큼만 나눕니다.
 * 20번으로 나누면 지금 화면을 맨 아래까지 내리는 스크롤 하나에 GIF가 1.4MB 들어 10MB 한도를 넘습니다.
 */
const WHEEL_STEPS = 10;
const WHEEL_STEP_MS = 25;
/** 휠 입력을 마친 뒤 스크롤이 멈췄는지 확인하는 간격입니다. */
const SCROLL_SETTLE_POLL_MS = 50;
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

  // 부드러운 스크롤은 마지막 휠 입력 뒤에도 한동안 이어져, 스크롤이 끝나는 시각이 녹화마다 달라집니다.
  // 휠 입력을 나눠 보내는 것만으로 녹화에서는 천천히 스크롤하는 것처럼 보이므로, 부드러운 스크롤을 끕니다.
  const browser = await chromium.launch({ args: ["--disable-smooth-scrolling"] });
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
  const startedAt = performance.now();
  const events: RecordingEvent[] = [];
  const note = (event: string, kind: RecordingEvent["kind"]) =>
    events.push({ name: event, kind, atMs: Math.round(performance.now() - startedAt) });

  // Playwright의 hover와 click은 대상이 화면에 다 들어오지 않으면 먼저 한 번에 스크롤해서, 녹화에 화면이 순간 이동한 모습이 남습니다.
  // 포인터를 대상에서 화면에 보이는 부분의 가운데로 직접 옮겨, 스크롤하지 않고 누릅니다.
  async function pointAt(element: Locator): Promise<{ x: number; y: number }> {
    await element.waitFor();
    const box = (await element.boundingBox())!;
    const viewport = page.viewportSize()!;
    const top = Math.max(box.y, 0);
    const bottom = Math.min(box.y + box.height, viewport.height);
    const point = { x: box.x + box.width / 2, y: (top + bottom) / 2 };
    await showPointer(POINTER_MOVE_MS);
    await page.mouse.move(point.x, point.y);
    return point;
  }

  await recording.play({
    page,
    pause: (ms) => page.waitForTimeout(ms),
    async click(element, event) {
      const { x, y } = await pointAt(element);
      await showPointer(POINTER_PRESS_MS, PRESS_MARK);
      await page.mouse.click(x, y);
      note(event, "click");
    },
    async scroll(deltaY, over, event) {
      const { x, y } = await pointAt(over);
      // 포인터를 보이는 동안에는 휠 입력마다 showActions의 duration만큼 기다리므로, 그 시간을 휠 입력 간격으로 씁니다.
      await showPointer(WHEEL_STEP_MS);
      for (let step = 0; step < WHEEL_STEPS; step += 1) {
        await page.mouse.wheel(0, deltaY / WHEEL_STEPS);
      }
      // mouse.wheel은 스크롤이 끝나기를 기다리지 않으므로, `over`가 멈춘 뒤의 시각을 남깁니다.
      let top = (await over.boundingBox())!.y;
      for (;;) {
        await page.waitForTimeout(SCROLL_SETTLE_POLL_MS);
        const next = (await over.boundingBox())!.y;
        if (next === top) break;
        top = next;
      }
      // screencast는 화면을 다시 그릴 때만 frame을 받아, 스크롤의 마지막 frame이 다음 화면 변화 때에야 녹화에 남습니다.
      // 포인터를 1px 옮겨 화면을 다시 그리게 해, 스크롤을 마친 화면이 이 시각에 녹화되게 합니다.
      await page.mouse.move(x, y + 1);
      note(event, "scroll");
    },
    mark: (event) => note(event, "mark"),
  });

  await page.screencast.stop();
  await page.close();
  writeFileSync(join(RECORDING_DIR, `${name}.events.json`), JSON.stringify(events, null, 2));
}

/** 화면을 열고 데모 데이터가 다 보일 때까지 기다립니다. */
async function open(
  context: BrowserContext,
  view: View,
  viewport: { width: number; height: number },
): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await view.prepare?.(page);
  await page.goto(view.path);
  for (const text of view.shows) {
    await page.getByText(text).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(SETTLE_MS);
  await view.frame?.(page);
  return page;
}
