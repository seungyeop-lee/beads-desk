import { describe, expect, test } from "vitest";
import {
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

test("소개 영상은 30초 이상 45초 이하다", () => {
  expect(INTRO_FRAMES / FPS).toBeGreaterThanOrEqual(30);
  expect(INTRO_FRAMES / FPS).toBeLessThanOrEqual(45);
});

test("모든 구간은 녹화 시작 이후에 시작하고, 시작보다 늦게 끝난다", () => {
  const clips = SHOTS.flatMap((shot) => shot.clips);
  expect(clips.filter(({ fromMs, toMs }) => fromMs < 0 || toMs <= fromMs)).toEqual([]);
});
