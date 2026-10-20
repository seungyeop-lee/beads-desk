import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, type RenderMediaOptions } from "@remotion/renderer";
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

type Output = {
  file: string;
  zoom: IntroProps["zoom"];
  options: Pick<RenderMediaOptions, "codec" | "scale" | "everyNthFrame" | "numberOfGifLoops">;
};

const OUTPUTS: Output[] = [
  { file: "beads-desk-intro.mp4", zoom: false, options: { codec: "h264" } },
  {
    file: "beads-desk-intro.gif",
    // 10MB 안에 들도록 GIF_FRAME_STEP frame마다 하나를 쓰고, 크기는 README 본문 폭에 맞춰 880×550으로 줄입니다.
    // 줄인 크기에서도 UI 글자를 읽을 수 있도록, 장면마다 보여 줄 영역을 확대합니다.
    zoom: true,
    options: {
      codec: "gif",
      scale: 11 / 18,
      everyNthFrame: GIF_FRAME_STEP,
      numberOfGifLoops: null,
    },
  },
];

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
      "본편이 확대 영역, 자막, 길이 규칙을 어깁니다.",
      ...tourProblems.map((problem) => `- ${problem}`),
      "introTimeline.ts의 TOUR에서 확대 영역의 시각을 옮기거나, captureTargets.ts의 tour 녹화에서 pause 길이를 고칩니다.",
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
      "녹화 구간의 경계가 화면을 불러오는 동안이나 장면의 동작 바로 앞뒤에 걸렸습니다.",
      ...loadingBoundaries.map((problem) => `- ${problem}`),
      "녹화의 frame을 보고, introTimeline.ts의 TOUR에서 구간의 from은 화면을 다 그린 뒤로, to는 화면이 바뀌기 전으로 옮깁니다.",
    ].join("\n"),
  );
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const serveUrl = await bundle({
  entryPoint: fileURLToPath(new URL("./index.ts", import.meta.url)),
  rootDir: PACKAGE_DIR,
  publicDir: RECORDING_DIR,
});
for (const output of OUTPUTS) {
  const outputLocation = join(OUTPUT_DIR, output.file);
  const inputProps: IntroProps = { zoom: output.zoom, tour };
  const composition = await selectComposition({ serveUrl, id: INTRO_ID, inputProps });
  await renderMedia({ serveUrl, composition, inputProps, outputLocation, ...output.options });

  const bytes = statSync(outputLocation).size;
  const scale = output.options.scale ?? 1;
  const fps = composition.fps / (output.options.everyNthFrame ?? 1);
  console.log(
    `${outputLocation}: ${(composition.durationInFrames / composition.fps).toFixed(1)}초, ` +
      `${Math.round(composition.width * scale)}×${Math.round(composition.height * scale)}, ` +
      `${fps.toFixed(1)}fps, ${(bytes / 1024 / 1024).toFixed(1)}MB`,
  );
  if (output.options.codec === "gif" && bytes > GIF_MAX_BYTES) {
    throw new Error(
      `GIF가 ${GIF_MAX_BYTES / 1024 / 1024}MB를 넘습니다. 크기나 frame rate를 줄입니다.`,
    );
  }
}
