import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, type RenderMediaOptions } from "@remotion/renderer";
import { INTRO_ID, SHOTS } from "./introTimeline.ts";

const PACKAGE_DIR = fileURLToPath(new URL("../../", import.meta.url));
/** 캡처 명령이 녹화를 저장하는 곳입니다. 영상은 이 디렉터리를 public 디렉터리로 삼아 녹화를 읽습니다. */
const RECORDING_DIR = join(PACKAGE_DIR, "recordings");
/** 만든 영상을 두는 곳입니다. 저장소에 넣지 않습니다. */
const OUTPUT_DIR = join(PACKAGE_DIR, "out");
/** GitHub에 이미지로 첨부할 수 있는 최대 크기입니다. README 맨 위의 GIF가 이 크기를 넘으면 안 됩니다. */
const GIF_MAX_BYTES = 10 * 1024 * 1024;

type Output = {
  file: string;
  options: Pick<RenderMediaOptions, "codec" | "scale" | "everyNthFrame" | "numberOfGifLoops">;
};

const OUTPUTS: Output[] = [
  { file: "beads-desk-intro.mp4", options: { codec: "h264" } },
  {
    file: "beads-desk-intro.gif",
    // 전체 장면을 담으면서 용량을 줄이도록, 25fps의 네 frame마다 하나를 써 6.25fps로, 크기는 README 본문 폭에 맞춰 960×540으로 줄입니다.
    options: { codec: "gif", scale: 0.6, everyNthFrame: 4, numberOfGifLoops: null },
  },
];

const missing = [...new Set(SHOTS.map((shot) => `${shot.recording}.webm`))].filter(
  (file) => !existsSync(join(RECORDING_DIR, file)),
);
if (missing.length > 0) {
  throw new Error(
    `${RECORDING_DIR}에 ${missing.join(", ")}이 없습니다. 먼저 pnpm --filter promo run capture로 화면을 녹화합니다.`,
  );
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const serveUrl = await bundle({
  entryPoint: fileURLToPath(new URL("./index.ts", import.meta.url)),
  rootDir: PACKAGE_DIR,
  publicDir: RECORDING_DIR,
});
const composition = await selectComposition({ serveUrl, id: INTRO_ID });

for (const output of OUTPUTS) {
  const outputLocation = join(OUTPUT_DIR, output.file);
  await renderMedia({ serveUrl, composition, outputLocation, ...output.options });

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
