/** Playwright 녹화가 25fps라서, 영상도 25fps로 만들어 녹화의 frame을 하나씩 그대로 씁니다. */
export const FPS = 25;
/**
 * 녹화의 viewport(CSS 픽셀)입니다. 녹화 frame은 CSS 픽셀 크기로 저장되므로, MP4는 녹화를 줄이거나 키우지 않고 그대로 놓아 글자가 흐려지지 않게 합니다.
 * README 폭에 맞춰 줄이는 GIF에서는 이 크기의 UI 글자를 읽을 수 없어서, 장면마다 보여 줄 영역(`focus`)을 확대합니다.
 */
export const RECORDING_SIZE = { width: 1280, height: 720 };
export const VIDEO_SIZE = { width: 1440, height: 900 };
/** 렌더링 명령이 고르는 composition입니다. MP4와 README GIF가 함께 씁니다. */
export const INTRO_ID = "intro";
/** 장면이 바뀔 때 앞 장면이 흐려지고 다음 장면이 나타나는 시간입니다. */
export const FADE_FRAMES = 8;
export const OUTRO_FRAMES = msToFrames(2500);
/** 앞 focus에서 다음 focus로 옮겨 가는 시간입니다. */
export const FOCUS_MOVE_MS = 600;

export type Caption = { title: string; text: string };

/** 녹화에서 잘라 쓰는 구간입니다. 시각은 그 녹화의 시작부터 지난 밀리초입니다. */
export type Clip = { fromMs: number; toMs: number };

/**
 * GIF에서 창 크기로 확대할 녹화의 영역입니다. 좌표와 너비는 녹화의 CSS 픽셀이고, 높이는 녹화의 비율을 따릅니다.
 * 녹화 시각 `atMs`부터 FOCUS_MOVE_MS 동안 앞 영역에서 이 영역으로 옮겨 갑니다.
 */
export type Focus = { atMs: number; x: number; y: number; width: number };

/** 자막 하나 아래 보이는 장면입니다. 구간이 여럿이면 화면을 불러오는 동안을 빼고 끊김 없이 이어 붙입니다. */
export type Shot = {
  /** captureTargets.ts의 캡처 대상 이름입니다. 녹화 파일은 `<recording>.webm`입니다. */
  recording: string;
  clips: Clip[];
  caption: Caption;
  /** 녹화 시각 순서로 둡니다. 첫 영역은 그 시각 전에도 쓰고, 비워 두면 녹화 전체를 보입니다. */
  focus?: Focus[];
};

/**
 * 영상에 이 순서로 이어 붙이는 장면입니다. 첫 장면이 hero입니다.
 * 구간은 captureTargets.ts의 동작과 pause 길이로 정해진 녹화 시각에 맞춘 값이므로, 장면의 동작을 바꾸면 함께 고칩니다.
 */
export const SHOTS: Shot[] = [
  {
    // 결제 epic의 단계를 보인 뒤, 진행 중인 결제 화면 이슈를 눌러 상세를 엽니다.
    recording: "plan-and-attachments",
    clips: [{ fromMs: 800, toMs: 4200 }],
    caption: { title: "Plan", text: "Follow the plan your agents laid out, stage by stage." },
    focus: [
      { atMs: 0, x: 30, y: 90, width: 1180 },
      { atMs: 2600, x: 388, y: 80, width: 860 },
    ],
  },
  {
    // 설명의 Mermaid 그림을 크게 본 뒤, 닫고 스크롤하는 동안을 빼고 결제 화면 스크린샷에서 이어 갑니다. 녹화 링크를 눌러 영상을 재생합니다.
    recording: "plan-and-attachments",
    clips: [
      { fromMs: 4200, toMs: 8000 },
      { fromMs: 10400, toMs: 16400 },
    ],
    caption: {
      title: "Attachments",
      text: "Open the diagrams, screenshots, and recordings they attach.",
    },
    focus: [
      { atMs: 4200, x: 388, y: 80, width: 860 },
      { atMs: 5800, x: 90, y: 50, width: 1100 },
      { atMs: 9500, x: 356, y: 165, width: 922 },
      { atMs: 12400, x: 160, y: 72, width: 960 },
    ],
  },
  {
    // 결정 목록에서 결정을 열고 Supersedes 링크로 이전 결정을 옆 패널에 엽니다. 상세와 옆 패널이 내용을 불러오는 동안을 뺍니다.
    recording: "decisions",
    clips: [
      { fromMs: 600, toMs: 2380 },
      { fromMs: 2800, toMs: 5100 },
      { fromMs: 5500, toMs: 6800 },
    ],
    caption: { title: "Decisions", text: "Look back at what was decided, and what it replaced." },
    focus: [
      { atMs: 0, x: 20, y: 60, width: 1000 },
      { atMs: 2500, x: 53, y: 36, width: 1174 },
    ],
  },
  {
    // Needs human에서 Legal review gate에 응답하고, 보드의 Ready 열에서 그 gate가 막던 카드를 보입니다.
    // 화면을 불러오는 동안과, 응답을 보낸 뒤 bd가 gate를 닫기까지 기다리는 동안을 뺍니다.
    recording: "respond-to-gate",
    clips: [
      { fromMs: 4200, toMs: 10700 },
      { fromMs: 15900, toMs: 17400 },
    ],
    caption: {
      title: "Needs human",
      text: "Answer their questions, and the work they held moves to Ready.",
    },
    focus: [
      { atMs: 0, x: 0, y: 0, width: 1280 },
      { atMs: 5600, x: 534, y: 140, width: 740 },
      { atMs: 14500, x: 20, y: 60, width: 800 },
    ],
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

/** 녹화 시각 ms에 보일 영역입니다. 옮겨 가는 동안에는 천천히 출발해 천천히 멈추고, 녹화 밖으로 나가지 않게 자릅니다. */
export function focusAt(focus: Focus[], ms: number): Omit<Focus, "atMs"> {
  const index = focus.findLastIndex((area) => area.atMs <= ms);
  const target = focus[Math.max(index, 0)];
  if (target === undefined) return { x: 0, y: 0, width: RECORDING_SIZE.width };
  const previous = focus[index - 1];
  const progress = (ms - target.atMs) / FOCUS_MOVE_MS;
  if (previous === undefined || progress >= 1) return clampFocus(target);
  const eased = (1 - Math.cos(Math.PI * progress)) / 2;
  const between = (key: "x" | "y" | "width") =>
    previous[key] + (target[key] - previous[key]) * eased;
  return clampFocus({ x: between("x"), y: between("y"), width: between("width") });
}

function clampFocus({ x, y, width }: Omit<Focus, "atMs">): Omit<Focus, "atMs"> {
  const { width: fullWidth, height: fullHeight } = RECORDING_SIZE;
  const clampedWidth = Math.min(width, fullWidth);
  const height = (clampedWidth * fullHeight) / fullWidth;
  return {
    x: Math.min(Math.max(x, 0), fullWidth - clampedWidth),
    y: Math.min(Math.max(y, 0), fullHeight - height),
    width: clampedWidth,
  };
}
