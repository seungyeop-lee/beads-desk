import { describe, expect, test } from "vitest";
import type { Tour } from "./introTimeline.ts";
import { findLoadingBoundaries, type ReadFrames } from "./loadingBoundaries.ts";

const PIXELS = 10_000;

/** 녹화의 frame 번호마다 화면을 정하는 가짜 녹화입니다. `screenAt`이 같은 값을 돌려주는 frame은 같은 화면입니다. */
function recording(screenAt: (frame: number) => number): ReadFrames {
  return async (_recording, frames) =>
    new Map(frames.map((frame) => [frame, new Uint8Array(PIXELS).fill(screenAt(frame))]));
}

const tour = (fromMs: number, toMs: number): Pick<Tour, "recording" | "clips"> => ({
  recording: "tour",
  clips: [
    { fromMs: 0, toMs: 2000 },
    { fromMs, toMs },
  ],
});

describe("녹화 구간 경계 검사", () => {
  test("경계 근처에서 화면이 바뀌지 않으면 문제가 없다", async () => {
    expect(
      await findLoadingBoundaries(
        tour(4000, 8000),
        recording(() => 200),
      ),
    ).toEqual([]);
  });

  test("구간이 목록을 불러오는 동안 시작하면, 녹화와 구간 순서와 fromMs를 알린다", async () => {
    // 4400ms(110번째 frame)에 목록이 나타납니다.
    const problems = await findLoadingBoundaries(
      tour(4000, 8000),
      recording((frame) => (frame < 110 ? 240 : 100)),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("tour.webm의 2번째 구간 fromMs 4000");
  });

  test("구간이 다음 화면으로 옮겨 간 뒤에 끝나면 toMs를 알린다", async () => {
    // 7600ms(190번째 frame)에 다음 화면으로 옮겨 가 목록이 비고, 1초가 지나도록 비어 있습니다.
    const problems = await findLoadingBoundaries(
      tour(4000, 8000),
      recording((frame) => (frame < 190 ? 100 : 240)),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("tour.webm의 2번째 구간 toMs 8000");
  });

  test("경계에서 1초보다 멀리 떨어진 화면 변화는 경계의 문제로 보지 않는다", async () => {
    // 5200ms에 장면의 동작으로 화면이 바뀝니다. 시작 경계(4000ms)에서 1초가 넘게 지난 뒤입니다.
    const problems = await findLoadingBoundaries(
      tour(4000, 8000),
      recording((frame) => (frame < 130 ? 100 : 160)),
    );
    expect(problems).toEqual([]);
  });

  test("포인터가 옮겨 가는 만큼의 작은 변화는 로딩으로 보지 않는다", async () => {
    const pointerMoved: ReadFrames = async (_recording, frames) =>
      new Map(
        frames.map((frame) => {
          const pixels = new Uint8Array(PIXELS).fill(200);
          // 포인터 크기만큼의 픽셀이 frame마다 다른 자리에 그려집니다.
          pixels.fill(0, frame * 4, frame * 4 + 2);
          return [frame, pixels];
        }),
      );
    expect(await findLoadingBoundaries(tour(4000, 8000), pointerMoved)).toEqual([]);
  });
});
