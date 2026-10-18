/** Playwright 녹화가 25fps라서, 영상도 25fps로 만들어 녹화의 frame을 하나씩 그대로 씁니다. */
export const FPS = 25;
/** 녹화의 너비는 1440이고, 높이는 화면마다 다를 수 있습니다(captureTargets.ts의 `height`). */
export const RECORDING_WIDTH = 1440;
export const VIDEO_SIZE = { width: 1600, height: 900 };
/** 렌더링 명령이 고르는 composition입니다. MP4와 README GIF가 함께 씁니다. */
export const INTRO_ID = "intro";
/** 장면이 바뀔 때 앞 장면이 흐려지고 다음 장면이 나타나는 시간입니다. */
export const FADE_FRAMES = 8;
export const OUTRO_FRAMES = 3 * FPS;

export type Caption = { title: string; text: string };

/** 녹화에서 잘라 쓰는 구간입니다. 시각은 그 녹화의 시작부터 지난 밀리초입니다. */
export type Clip = { fromMs: number; toMs: number };

/** 자막 하나 아래 보이는 장면입니다. 구간이 여럿이면 화면을 불러오는 동안을 빼고 끊김 없이 이어 붙입니다. */
export type Shot = {
  /** captureTargets.ts의 캡처 대상 이름입니다. 녹화 파일은 `<recording>.webm`입니다. */
  recording: string;
  clips: Clip[];
  caption: Caption;
};

/**
 * 영상에 이 순서로 이어 붙이는 장면입니다. 첫 장면이 hero입니다.
 * 구간은 captureTargets.ts의 동작과 pause 길이로 정해진 녹화 시각에 맞춘 값이므로, 장면의 동작을 바꾸면 함께 고칩니다.
 */
export const SHOTS: Shot[] = [
  {
    // 보드에서 Legal review gate가 막은 카드를 보인 뒤 Needs human으로 옮겨 가 그 gate에 응답하고, 보드로 돌아옵니다.
    // 화면을 옮길 때마다 목록이 빈 채 불러오는 동안과, 보드가 human gate 제목을 불러와 다른 카드의 막힘 표시를 바꾸는 동안을 뺍니다.
    recording: "respond-to-gate",
    clips: [
      { fromMs: 0, toMs: 3250 },
      { fromMs: 5400, toMs: 18400 },
      { fromMs: 20000, toMs: 23300 },
    ],
    caption: {
      title: "Needs human",
      text: "Answer the gates your agents leave, and the work they held back is Ready.",
    },
  },
  {
    // 첫 pause가 끝나면 In progress 목록 위로 포인터가 옮겨 가 스크롤합니다.
    recording: "now",
    clips: [{ fromMs: 600, toMs: 5400 }],
    caption: { title: "Now", text: "What is in progress, up next, and blocked, at a glance." },
  },
  {
    recording: "graph",
    clips: [{ fromMs: 0, toMs: 5000 }],
    caption: { title: "Graph", text: "See which work can run in parallel, stage by stage." },
  },
  {
    // Decisions 목록이 나타난 뒤부터 씁니다. 결정을 클릭해 내용을 엽니다.
    recording: "decisions",
    clips: [{ fromMs: 3000, toMs: 8200 }],
    caption: { title: "Decisions", text: "Look back at what was decided, and why." },
  },
  {
    // 카드를 Ready에서 In progress로 끌어 옮깁니다.
    recording: "drag-card",
    clips: [{ fromMs: 1200, toMs: 7400 }],
    caption: { title: "Board", text: "Drag a card to change its status." },
  },
];

export function msToFrames(ms: number): number {
  return Math.round((ms * FPS) / 1000);
}

export function clipFrames(clip: Clip): number {
  return msToFrames(clip.toMs - clip.fromMs);
}

/** 영상에서 장면이나 녹화 구간 하나가 놓이는 frame 구간입니다. */
export type Slot = { from: number; frames: number };
export type IntroSchedule = { shots: (Shot & Slot)[]; outro: Slot };

/** 항목을 이 순서로 겹치지 않게 이어 놓습니다. */
export function placeInOrder<T>(items: T[], framesOf: (item: T) => number): (T & Slot)[] {
  let from = 0;
  return items.map((item) => {
    const slot = { ...item, from, frames: framesOf(item) };
    from += slot.frames;
    return slot;
  });
}

/** 장면을 이 순서로 겹치지 않게 이어 붙이고, 마지막 장면 뒤에 설치 안내를 둡니다. */
export function introSchedule(shots: Shot[]): IntroSchedule {
  const placed = placeInOrder(shots, (shot) =>
    shot.clips.reduce((sum, clip) => sum + clipFrames(clip), 0),
  );
  const last = placed.at(-1);
  return {
    shots: placed,
    outro: { from: last ? last.from + last.frames : 0, frames: OUTRO_FRAMES },
  };
}

export const INTRO_SCHEDULE = introSchedule(SHOTS);
export const INTRO_FRAMES = INTRO_SCHEDULE.outro.from + INTRO_SCHEDULE.outro.frames;
