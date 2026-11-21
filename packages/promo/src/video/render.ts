import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderFrames, renderMedia, selectComposition } from "@remotion/renderer";
import {
  findTourProblems,
  GIF_FRAME_STEP,
  INTRO_ID,
  resolveTour,
  TOUR,
  type RecordingEvent,
} from "./introTimeline.ts";
import type { IntroProps } from "./IntroVideo.tsx";
import { findLoadingBoundaries } from "./loadingBoundaries.ts";
import { openRecordingFrames } from "./recordingFrames.ts";

const PACKAGE_DIR = fileURLToPath(new URL("../../", import.meta.url));
/** 캡처 명령이 녹화를 저장하는 곳입니다. 영상은 이 디렉터리를 public 디렉터리로 삼아 녹화를 읽습니다. */
const RECORDING_DIR = join(PACKAGE_DIR, "recordings");
/** 만든 영상을 두는 곳입니다. 저장소에 넣지 않습니다. */
const OUTPUT_DIR = join(PACKAGE_DIR, "out");
/** GitHub에 이미지로 첨부할 수 있는 최대 크기입니다. README 맨 위의 GIF가 이 크기를 넘으면 안 됩니다. */
const GIF_MAX_BYTES = 10 * 1024 * 1024;

const GIF_SCALE = 11 / 18;

const eventsFile = `${TOUR.recording}.events.json`;
const missing = [`${TOUR.recording}.webm`, eventsFile].filter(
  (file) => !existsSync(join(RECORDING_DIR, file)),
);
if (missing.length > 0) {
  throw new Error(
    `${RECORDING_DIR}에 ${missing.join(", ")}이 없습니다. 먼저 pnpm --filter promo run capture로 화면을 녹화합니다.`,
  );
}

const events = JSON.parse(
  readFileSync(join(RECORDING_DIR, eventsFile), "utf8"),
) as RecordingEvent[];
const tour = resolveTour(TOUR, events);

const tourProblems = findTourProblems(tour, events);
if (tourProblems.length > 0) {
  throw new Error(
    [
      "본편이 강조 효과, 자막, 길이 규칙을 어깁니다.",
      ...tourProblems.map((problem) => `- ${problem}`),
      "introTimeline.ts의 TOUR에서 효과 시각을 옮기거나, captureTargets.ts의 tour 녹화에서 pause 길이를 고칩니다.",
    ].join("\n"),
  );
}

// 경계가 로딩 중인 화면에 걸리면 영상에 빈 목록이나 바뀌기 전 표시가 섞이므로, 렌더링하기 전에 멈춥니다.
const recordingFrames = await openRecordingFrames(RECORDING_DIR);
const loadingBoundaries = await findLoadingBoundaries(tour, recordingFrames.read).finally(() =>
  recordingFrames.close(),
);
if (loadingBoundaries.length > 0) {
  throw new Error(
    [
      "녹화 구간의 경계나 강조 효과가 화면이 바뀌는 동안에 걸렸습니다.",
      ...loadingBoundaries.map((problem) => `- ${problem}`),
      "녹화의 frame을 보고 introTimeline.ts의 TOUR에서 해당 경계나 효과를 안정적인 화면으로 옮깁니다.",
    ].join("\n"),
  );
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const serveUrl = await bundle({
  entryPoint: fileURLToPath(new URL("./index.ts", import.meta.url)),
  rootDir: PACKAGE_DIR,
  publicDir: RECORDING_DIR,
});
await renderIntro("mp4", tour);
let gifTour = tour;
let gifBytes = await renderIntro("gif", gifTour);
for (const effect of ["spotlight", "자막 등장", "카메라 확대"] as const) {
  if (gifBytes <= GIF_MAX_BYTES) break;
  console.log(`GIF ${gifBytes}B > ${GIF_MAX_BYTES}B: ${effect} 효과를 빼고 다시 만듭니다.`);
  if (effect === "spotlight") gifTour = { ...gifTour, spotlights: [] };
  else if (effect === "자막 등장") {
    gifTour = {
      ...gifTour,
      captions: gifTour.captions.map(({ atMs, title, text }) => ({ atMs, title, text })),
    };
  } else gifTour = { ...gifTour, focus: [] };
  gifBytes = await renderIntro("gif", gifTour);
}
if (gifBytes > GIF_MAX_BYTES)
  throw new Error(`효과를 모두 뺀 GIF도 ${gifBytes}B로 ${GIF_MAX_BYTES}B를 넘습니다.`);

async function renderIntro(format: "mp4" | "gif", tour: IntroProps["tour"]): Promise<number> {
  const gif = format === "gif";
  const outputLocation = join(OUTPUT_DIR, `beads-desk-intro.${format}`);
  const inputProps: IntroProps = { tour };
  const composition = await selectComposition({ serveUrl, id: INTRO_ID, inputProps });
  const scale = gif ? GIF_SCALE : 1;
  const fps = composition.fps / (gif ? GIF_FRAME_STEP : 1);
  if (gif) {
    const dir = mkdtempSync(join(tmpdir(), "beads-intro-gif-"));
    try {
      const { assetsInfo } = await renderFrames({
        serveUrl,
        composition,
        inputProps,
        scale,
        everyNthFrame: GIF_FRAME_STEP,
        imageFormat: "png",
        outputDir: dir,
        onStart: ({ frameCount }) => console.log(`GIF에 쓸 ${frameCount}개 frame을 렌더링합니다.`),
        onFrameUpdate: (count) => {
          if (count % 100 === 0) console.log(`GIF frame ${count}개를 렌더링했습니다.`);
        },
      });
      const input = [
        "-v",
        "error",
        "-y",
        "-framerate",
        `${composition.fps}/${GIF_FRAME_STEP}`,
        "-i",
        assetsInfo.imageSequenceName,
      ];
      const palette = join(dir, "palette.png");
      execFileSync("ffmpeg", [
        ...input,
        "-vf",
        "palettegen=stats_mode=diff",
        "-frames:v",
        "1",
        palette,
      ]);
      execFileSync("ffmpeg", [
        ...input,
        "-i",
        palette,
        "-lavfi",
        "paletteuse=dither=none:diff_mode=rectangle",
        "-loop",
        "0",
        outputLocation,
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } else {
    await renderMedia({ serveUrl, composition, inputProps, outputLocation, codec: "h264" });
  }

  const bytes = statSync(outputLocation).size;
  console.log(
    `${outputLocation}: ${(composition.durationInFrames / composition.fps).toFixed(1)}초, ` +
      `${Math.round(composition.width * scale)}×${Math.round(composition.height * scale)}, ` +
      `${fps.toFixed(1)}fps, ${bytes}B (${(bytes / 1024 / 1024).toFixed(1)}MiB)`,
  );
  return bytes;
}
