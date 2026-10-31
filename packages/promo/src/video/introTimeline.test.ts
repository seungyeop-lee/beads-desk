import { describe, expect, test } from "vitest";
import {
  FOCUS_MOVE_MS,
  focusAt,
  FPS,
  findTourProblems,
  introSchedule,
  OUTRO_FADE_FRAMES,
  OUTRO_FRAMES,
  recordingMsAt,
  resolveTour,
  TOUR,
  videoMsAt,
  type RecordingEvent,
  type Tour,
} from "./introTimeline.ts";

const FULL = { x: 0, y: 0, width: 1280 };
const click = (name: string, atMs: number): RecordingEvent => ({ name, kind: "click", atMs });

/** 0–28초를 끊김 없이 쓰는 본편입니다. 설치 안내를 더하면 29.7초입니다. */
const tour = (overrides: Partial<Tour>): Tour => ({
  recording: "tour",
  clips: [{ fromMs: 0, toMs: 28_000 }],
  focus: [{ atMs: 0, ...FULL }],
  captions: [],
  ...overrides,
});

describe("본편 일정", () => {
  test("설치 안내는 본편이 끝나기 OUTRO_FADE_FRAMES 전부터 겹쳐 놓는다", () => {
    const schedule = introSchedule(tour({ clips: [{ fromMs: 600, toMs: 6000 }] }));
    expect(schedule.tour).toEqual({ from: 0, frames: 5.4 * FPS });
    expect(schedule.outro).toEqual({ from: 5.4 * FPS - OUTRO_FADE_FRAMES, frames: OUTRO_FRAMES });
    expect(schedule.frames).toBe(5.4 * FPS - OUTRO_FADE_FRAMES + OUTRO_FRAMES);
  });

  const clips = [
    { fromMs: 0, toMs: 3000 },
    { fromMs: 5000, toMs: 6000 },
  ];

  test("본편의 frame은 구간 사이에서 빼낸 시간을 건너뛴 녹화 시각을 보인다", () => {
    expect(recordingMsAt(clips, 0)).toBe(0);
    expect(recordingMsAt(clips, 3 * FPS)).toBe(5000);
    expect(recordingMsAt(clips, 3.5 * FPS)).toBe(5500);
  });

  test("빼낸 시간 안의 녹화 시각은 다음 구간이 시작하는 영상 시각에 보인다", () => {
    expect(videoMsAt(clips, 2000)).toBe(2000);
    expect(videoMsAt(clips, 4000)).toBe(3000);
    expect(videoMsAt(clips, 5500)).toBe(3500);
  });
});

test("동작 이름으로 적은 시각을 녹화의 동작 시각에서 센 시각으로 푼다", () => {
  const resolved = resolveTour(
    {
      recording: "tour",
      clips: [{ from: { ms: 0 }, to: { after: "open", ms: 100 } }],
      focus: [{ at: { after: "shown", ms: 500 }, ...FULL }],
      captions: [{ at: { after: "open", ms: 0 }, title: "Plan", text: "" }],
    },
    [click("open", 3000), { name: "shown", kind: "mark", atMs: 3800 }],
  );
  expect(resolved.clips).toEqual([{ fromMs: 0, toMs: 3100 }]);
  expect(resolved.focus[0]!.atMs).toBe(4300);
  expect(resolved.captions[0]!.atMs).toBe(3000);
  expect(() => resolveTour(TOUR, [])).toThrow("open-issue");
});

describe("본편 규칙", () => {
  test("확대 영역은 클릭 뒤 화면이 바뀌는 0.5초 안에 움직이지 않는다", () => {
    const moveAt = (atMs: number) =>
      findTourProblems(
        tour({
          focus: [
            { atMs: 0, ...FULL },
            { atMs, x: 100, y: 100, width: 800 },
          ],
        }),
        [click("open-plan", 5000)],
      );
    expect(moveAt(5300)).toEqual([expect.stringContaining("open-plan 클릭")]);
    expect(moveAt(5000 - FOCUS_MOVE_MS + 100)).toEqual([expect.stringContaining("open-plan")]);
    expect(moveAt(5500)).toEqual([]);
  });

  test("클릭 뒤 0.5초는 구간 사이에서 빼낸 시간을 건너뛰고 센다", () => {
    // 5100–6000ms를 빼냈으므로, 6100ms는 클릭하고 0.2초 뒤에 보입니다.
    const problems = findTourProblems(
      tour({
        clips: [
          { fromMs: 0, toMs: 5100 },
          { fromMs: 6000, toMs: 28_900 },
        ],
        focus: [
          { atMs: 0, ...FULL },
          { atMs: 6100, x: 100, y: 100, width: 800 },
        ],
      }),
      [click("open-plan", 5000)],
    );
    expect(problems).toEqual([expect.stringContaining("open-plan 클릭")]);
  });

  test("자막이 나타난 뒤 글자 수만큼 읽을 시간이 지나야 다음 동작을 한다", () => {
    // 30자는 초당 15자로 2초 동안 읽습니다.
    const caption = { atMs: 1000, title: "Plan", text: "x".repeat(30) };
    const nextClickAt = (atMs: number) =>
      findTourProblems(tour({ captions: [caption] }), [click("open-plan", atMs)]);
    expect(nextClickAt(2900)).toEqual([expect.stringContaining('"Plan" 자막')]);
    expect(nextClickAt(3000)).toEqual([]);
  });

  test("짧은 자막도 1.2초는 다음 동작 없이 둔다", () => {
    const caption = { atMs: 1000, title: "Plan", text: "Short" };
    expect(findTourProblems(tour({ captions: [caption] }), [click("open-plan", 2100)])).toEqual([
      expect.stringContaining('"Plan" 자막'),
    ]);
  });

  test("자막을 읽는 동안 확대 영역은 한 번까지만 움직인다", () => {
    const caption = { atMs: 1000, title: "Plan", text: "x".repeat(45) };
    const focus = [
      { atMs: 0, ...FULL },
      { atMs: 1200, x: 100, y: 100, width: 800 },
      { atMs: 2400, x: 200, y: 100, width: 800 },
    ];
    expect(findTourProblems(tour({ captions: [caption], focus }), [])).toEqual([
      expect.stringContaining("2번 움직입니다"),
    ]);
    expect(findTourProblems(tour({ captions: [caption], focus: focus.slice(0, 2) }), [])).toEqual(
      [],
    );
  });

  test("영상이 38초를 넘으면 알린다", () => {
    expect(findTourProblems(tour({ clips: [{ fromMs: 0, toMs: 37_000 }] }), [])).toEqual([
      expect.stringContaining("영상 길이"),
    ]);
  });
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
