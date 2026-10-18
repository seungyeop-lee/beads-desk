import { join } from "node:path";
import { chromium } from "playwright";
import { FPS } from "./introTimeline.ts";

/**
 * 화면 맨 위의 머리글(높이 56과 아래 border 1)을 덮는 높이(CSS 픽셀)입니다. 포인터가 화면 이동 링크 위를 지나가거나
 * 개수 badge가 바뀌어도 화면 내용이 바뀐 것으로 세지 않도록, 이 높이를 잘라 내고 읽습니다.
 */
const APP_HEADER_HEIGHT = 60;
/** 비교에는 글자 모양까지 필요하지 않으므로, 녹화를 이 비율로 줄여 읽습니다. */
const READ_SCALE = 0.25;
/** 녹화를 이 주소로 열어, page와 같은 origin에서 읽습니다. 다른 origin의 video를 그린 canvas는 픽셀을 읽을 수 없습니다. */
const ORIGIN = "http://recordings.invalid";

/** 녹화에서 머리글 아래 화면을 줄여 읽은 frame입니다. 픽셀마다 밝기(0–255) 하나를 둡니다. */
export type Frame = Uint8Array;

export type RecordingFrames = {
  /** `<recording>.webm`에서 `frames` 번째 frame들을 읽어 frame 번호로 찾게 돌려줍니다. frame 번호는 녹화 시작부터 셉니다. */
  read(recording: string, frames: number[]): Promise<Map<number, Frame>>;
  close(): Promise<void>;
};

/** Playwright의 chromium에서 녹화를 재생 위치로 옮겨 가며 frame을 그려 읽습니다. */
export async function openRecordingFrames(recordingDir: string): Promise<RecordingFrames> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route(`${ORIGIN}/**`, (route) => {
    const name = new URL(route.request().url()).pathname.slice(1);
    return name ? route.fulfill({ path: join(recordingDir, name) }) : route.fulfill({ body: "" });
  });
  await page.goto(ORIGIN);

  return {
    async read(recording, frames) {
      const lumas = await page.evaluate(
        async ({ src, frames, fps, cropTop, scale }) => {
          // route가 돌려주는 응답은 Range 요청을 받지 않아 재생 위치를 옮길 수 없으므로, 파일 전체를 blob으로 받아 엽니다.
          const blob = await (await fetch(src)).blob();
          const video = document.createElement("video");
          video.muted = true;
          video.src = URL.createObjectURL(blob);
          await new Promise((resolve, reject) => {
            video.onloadeddata = resolve;
            video.onerror = () => reject(new Error(`${src}를 열 수 없습니다.`));
          });
          const sourceHeight = video.videoHeight - cropTop;
          const width = Math.round(video.videoWidth * scale);
          const height = Math.round(sourceHeight * scale);
          const context = new OffscreenCanvas(width, height).getContext("2d", {
            willReadFrequently: true,
          })!;

          const lumas: Uint8Array[] = [];
          for (const frame of frames) {
            // frame이 화면에 머무는 시간의 가운데로 옮겨야, 시각을 반올림하다 앞뒤 frame을 읽지 않습니다.
            video.currentTime = (frame + 0.5) / fps;
            await new Promise((resolve) =>
              video.addEventListener("seeked", resolve, { once: true }),
            );
            context.drawImage(
              video,
              0,
              cropTop,
              video.videoWidth,
              sourceHeight,
              0,
              0,
              width,
              height,
            );
            const rgba = context.getImageData(0, 0, width, height).data;
            const luma = new Uint8Array(width * height);
            for (let i = 0; i < luma.length; i++) {
              luma[i] =
                (rgba[i * 4]! * 299 + rgba[i * 4 + 1]! * 587 + rgba[i * 4 + 2]! * 114) / 1000;
            }
            lumas.push(luma);
          }
          URL.revokeObjectURL(video.src);
          return lumas;
        },
        {
          src: `${ORIGIN}/${recording}.webm`,
          frames,
          fps: FPS,
          cropTop: APP_HEADER_HEIGHT,
          scale: READ_SCALE,
        },
      );
      return new Map(frames.map((frame, index) => [frame, lumas[index]!]));
    },
    close: () => browser.close(),
  };
}
