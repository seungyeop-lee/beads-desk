import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { chromium, type BrowserContext, type Page } from "playwright";
import { isolatedBdEnv } from "../seed/isolatedBdEnv.ts";
import { startAppServer } from "./appServer.ts";
import type { BdCommandLog, CaptureLog, SceneLog } from "./captureLog.ts";
import { CAPTURE_TARGETS, type CaptureTarget, type View } from "./captureTargets.ts";

/** README가 참조하는 스크린샷입니다. 저장소에 commit합니다. */
const SCREENSHOT_DIR = fileURLToPath(new URL("../../../../docs/screenshots/", import.meta.url));
/** 소개 영상의 원본 녹화와 captureLog.json입니다. 저장소에 넣지 않습니다. */
const RECORDING_DIR = fileURLToPath(new URL("../../recordings/", import.meta.url));
const SEED_SCRIPT = fileURLToPath(new URL("../seed/seed.ts", import.meta.url));
/** 화면 머리글에 workspace 디렉터리 이름이 보이므로, 새로 만드는 데모 workspace는 이 이름의 디렉터리에 둡니다. */
const DEMO_DIRECTORY_NAME = "acme-web";
const VIEWPORT = { width: 1440, height: 900 };
const DEVICE_SCALE_FACTOR = 2;
/** 데모 데이터를 불러온 뒤 차트 animation과 글꼴 적용이 끝나기를 기다리는 시간입니다. */
const SETTLE_MS = 1500;

const { values } = parseArgs({ options: { workspace: { type: "string" } } });

const home = mkdtempSync(join(tmpdir(), "beads-desk-promo-home-"));
const scratch = values.workspace
  ? undefined
  : realpathSync(mkdtempSync(join(tmpdir(), "beads-desk-promo-capture-")));
try {
  const workspace = scratch ? seedDemoWorkspace(scratch) : existingWorkspace(values.workspace!);
  const env = isolatedBdEnv(home);
  const server = await startAppServer(workspace, env);
  try {
    const log = await captureAll(server.url, (args) => runBd(workspace, env, args));
    writeFileSync(join(RECORDING_DIR, "captureLog.json"), `${JSON.stringify(log, null, 2)}\n`);
  } finally {
    await server.stop();
  }
} finally {
  rmSync(home, { recursive: true, force: true });
  if (scratch) rmSync(scratch, { recursive: true, force: true });
}
console.log(
  `스크린샷은 ${SCREENSHOT_DIR}에, 녹화와 bd 명령 기록은 ${RECORDING_DIR}에 저장했습니다.`,
);

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

type RunBd = (args: string[]) => Promise<string>;

async function runBd(workspace: string, env: NodeJS.ProcessEnv, args: string[]): Promise<string> {
  // 녹화는 이 프로세스의 event loop에서 frame을 받으므로, bd를 기다리는 동안 event loop를 막지 않습니다.
  const { stdout } = await promisify(execFile)("bd", args, {
    cwd: workspace,
    env,
    encoding: "utf8",
  });
  return stdout;
}

async function captureAll(baseURL: string, bd: RunBd): Promise<CaptureLog> {
  rmSync(RECORDING_DIR, { recursive: true, force: true });
  mkdirSync(RECORDING_DIR, { recursive: true });
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      baseURL,
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      locale: "en-US",
      colorScheme: "light",
    });
    await context.addCookies([
      { name: "beads-desk-locale", value: "en", url: baseURL },
      { name: "beads-desk-theme", value: "light", url: baseURL },
    ]);
    const scenes: SceneLog[] = [];
    for (const target of CAPTURE_TARGETS) {
      if (target.screenshot) await takeScreenshot(context, target.name, target.screenshot);
      scenes.push(await record(context, target, bd));
      console.log(`${target.name} 화면을 캡처했습니다.`);
    }
    return {
      capturedAt: new Date().toISOString(),
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      scenes,
    };
  } finally {
    await browser.close();
  }
}

async function takeScreenshot(context: BrowserContext, name: string, view: View): Promise<void> {
  const page = await open(context, view);
  await page.screenshot({ path: join(SCREENSHOT_DIR, `${name}.png`), animations: "disabled" });
  await page.close();
}

async function record(
  context: BrowserContext,
  target: CaptureTarget,
  bd: RunBd,
): Promise<SceneLog> {
  const page = await open(context, target.recording);
  const video = `${target.name}.webm`;
  // screencast frame은 deviceScaleFactor와 관계없이 CSS 픽셀 크기로 옵니다.
  // 더 큰 size를 주면 화면이 확대되지 않고 왼쪽 위에 놓인 채 나머지가 회색으로 채워집니다.
  await page.screencast.start({ path: join(RECORDING_DIR, video), size: VIEWPORT });
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);
  const bdCommands: BdCommandLog[] = [];

  await target.recording.play({
    page,
    pause: (ms) => page.waitForTimeout(ms),
    async scroll(deltaY) {
      const steps = 20;
      await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
      for (let step = 0; step < steps; step += 1) {
        await page.mouse.wheel(0, deltaY / steps);
        await page.waitForTimeout(25);
      }
    },
    async bd(args, shown) {
      const startMs = elapsed();
      const stdout = await bd(args);
      const endMs = elapsed();
      await page
        .getByRole("region", { name: shown.column, exact: true })
        .getByText(shown.text)
        .waitFor({ timeout: 30_000 });
      bdCommands.push({ args, stdout, startMs, endMs, shownMs: elapsed() });
    },
  });

  await page.screencast.stop();
  await page.close();
  return { name: target.name, video, bdCommands };
}

/** 화면을 열고 데모 데이터가 다 보일 때까지 기다립니다. */
async function open(context: BrowserContext, view: View): Promise<Page> {
  const page = await context.newPage();
  await page.goto(view.path);
  for (const text of view.shows) {
    await page.getByText(text).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(SETTLE_MS);
  return page;
}
