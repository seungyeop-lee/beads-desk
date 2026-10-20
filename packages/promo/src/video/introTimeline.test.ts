import { describe, expect, test } from "vitest";
import {
  FOCUS_MOVE_MS,
  focusAt,
  FPS,
  INTRO_FRAMES,
  introSchedule,
  OUTRO_FRAMES,
  SHOTS,
  type Shot,
} from "./introTimeline.ts";

const shot = (...clips: [number, number][]): Shot => ({
  recording: "now",
  clips: clips.map(([fromMs, toMs]) => ({ fromMs, toMs })),
  caption: { title: "Now", text: "" },
});

describe("장면 일정", () => {
  test("장면을 겹치지 않게 이어 붙이고, 마지막 장면 뒤에 설치 안내를 둔다", () => {
    const { shots, outro } = introSchedule([shot([600, 6000]), shot([1000, 3000])]);
    expect(shots.map(({ from, frames }) => ({ from, frames }))).toEqual([
      { from: 0, frames: 5.4 * FPS },
      { from: 5.4 * FPS, frames: 2 * FPS },
    ]);
    expect(outro).toEqual({ from: 7.4 * FPS, frames: OUTRO_FRAMES });
  });

  test("구간이 여럿인 장면은 빼낸 시간 없이 구간들의 길이를 더한 만큼 머문다", () => {
    const { shots } = introSchedule([shot([0, 3000], [5000, 6000])]);
    expect(shots[0]!.frames).toBe(4 * FPS);
  });
});

test("소개 영상은 25초 이상 30초 이하다", () => {
  expect(INTRO_FRAMES / FPS).toBeGreaterThanOrEqual(25);
  expect(INTRO_FRAMES / FPS).toBeLessThanOrEqual(30);
});

test("모든 구간은 녹화 시작 이후에 시작하고, 시작보다 늦게 끝난다", () => {
  const clips = SHOTS.flatMap((shot) => shot.clips);
  expect(clips.filter(({ fromMs, toMs }) => fromMs < 0 || toMs <= fromMs)).toEqual([]);
});

describe("확대 영역", () => {
  const focus = [
    { atMs: 1000, x: 0, y: 0, width: 1280 },
    { atMs: 3000, x: 400, y: 100, width: 640 },
  ];

  test("첫 영역의 시각 전에는 첫 영역을, 옮겨 간 뒤에는 다음 영역을 보인다", () => {
    expect(focusAt(focus, 0)).toEqual({ x: 0, y: 0, width: 1280 });
    expect(focusAt(focus, 3000 + FOCUS_MOVE_MS)).toEqual({ x: 400, y: 100, width: 640 });
  });

  test("옮겨 가는 동안에는 두 영역 사이를 지난다", () => {
    const { x, width } = focusAt(focus, 3000 + FOCUS_MOVE_MS / 2);
    expect(x).toBeCloseTo(200);
    expect(width).toBeCloseTo(960);
  });

  test("녹화 밖으로 나가는 영역은 녹화 안으로 자른다", () => {
    const area = focusAt([{ atMs: 0, x: 1000, y: 600, width: 640 }], 0);
    expect(area).toEqual({ x: 1280 - 640, y: 720 - 360, width: 640 });
  });
});
