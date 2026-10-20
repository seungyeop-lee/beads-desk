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
/**
 * README GIF는 영상의 이 frame 수마다 하나만 씁니다. 25fps에서 3이면 약 8.3fps입니다.
 * 2(12.5fps)로 두면 GitHub 이미지 첨부 한도인 10MB에 거의 닿아, 다시 캡처할 때마다 넘을 수 있습니다.
 */
export const GIF_FRAME_STEP = 3;
/** 설치 안내가 녹화 위로 나타나는 시간이자, 끝에서 영상의 첫 frame으로 바뀌는 시간입니다. 첫 frame으로 끝나야 GIF가 이음매 없이 반복됩니다. */
export const OUTRO_FADE_FRAMES = msToFrames(300);
export const OUTRO_FRAMES = msToFrames(2000);
/** 앞 focus에서 다음 focus로 옮겨 가는 시간입니다. */
export const FOCUS_MOVE_MS = 600;
/** 클릭한 뒤 dialog, 패널, 화면이 바뀌는 시간입니다. 이 동안 확대 영역이 움직이면 화면 전환과 카메라 이동이 겹쳐 무엇이 열렸는지 알아보기 어렵습니다. */
export const SCREEN_CHANGE_MS = 500;
/** 자막이 나타난 뒤 다음 클릭까지 비워 두는 최소 시간과, 자막을 읽는 속도(초당 글자 수)입니다. */
export const CAPTION_MIN_MS = 1200;
export const CAPTION_CHARS_PER_SECOND = 15;
/** 소개 영상 길이의 범위(초)입니다. README GIF는 30초를 넘지 않게 합니다. */
export const INTRO_SECONDS = { min: 25, max: 30 };

/** capture가 녹화하는 동안 남긴 동작과 그 녹화 시각입니다. `<녹화 이름>.events.json`에 녹화 순서로 저장합니다. */
export type RecordingEvent = { name: string; kind: "click" | "scroll" | "mark"; atMs: number };

/** 녹화 시각입니다. `after`가 있으면 그 이름의 동작에서 `ms`만큼 지난 시각이고, 없으면 녹화 시작에서 지난 시각입니다. */
export type Moment = { after?: string; ms: number };

export type Caption = { title: string; text: string };

/** 녹화에서 잘라 쓰는 구간입니다. 시각은 녹화 시작부터 지난 밀리초입니다. */
export type Clip = { fromMs: number; toMs: number };

/**
 * GIF에서 창 크기로 확대할 녹화의 영역입니다. 좌표와 너비는 녹화의 CSS 픽셀이고, 높이는 녹화의 비율을 따릅니다.
 * 녹화 시각 `atMs`부터 FOCUS_MOVE_MS 동안 앞 영역에서 이 영역으로 옮겨 갑니다.
 */
export type Focus = { atMs: number; x: number; y: number; width: number };
type FocusArea = Omit<Focus, "atMs">;

/** 녹화 시각 `atMs`부터 다음 자막이 나올 때까지 보이는 자막입니다. 화면에 놓는 위치는 영상 구성이 정합니다. */
export type CaptionCue = Caption & { atMs: number };

/** 녹화 하나를 잘라 이어 붙인 소개 영상의 본편입니다. 시각은 모두 녹화 시각입니다. */
export type Tour = {
  /** captureTargets.ts의 캡처 대상 이름입니다. 녹화 파일은 `<recording>.webm`입니다. */
  recording: string;
  /** 영상에 차례로 이어 붙이는 구간입니다. 구간 사이에서 빼낸 시간은 화면을 불러오는 동안입니다. */
  clips: Clip[];
  /** 녹화 시각 순서로 둡니다. 첫 영역은 그 시각 전에도 쓰고, 비워 두면 녹화 전체를 보입니다. */
  focus: Focus[];
  /** 녹화 시각 순서로 둡니다. 장면마다 하나씩, 그 장면을 여는 동작의 시각에 바뀝니다. */
  captions: CaptionCue[];
};

/** 녹화 시각을 동작 이름으로 적은 Tour입니다. 동작 시각은 녹화할 때마다 달라지므로, 영상을 만들 때 녹화의 동작 기록으로 풉니다. */
export type TourPlan = {
  recording: string;
  clips: { from: Moment; to: Moment }[];
  focus: (FocusArea & { at: Moment })[];
  captions: (Caption & { at: Moment })[];
};

const FULL: FocusArea = { x: 0, y: 0, width: RECORDING_SIZE.width };

/**
 * 결제 epic 하나를 따라가는 소개 영상의 본편입니다. 동작 이름은 captureTargets.ts의 tour 녹화가 남깁니다.
 * 클릭 뒤 화면을 불러오는 동안은 구간 사이에서 빼고, 확대 영역은 클릭 뒤 화면이 다 바뀐 다음에 옮깁니다.
 */
export const TOUR: TourPlan = {
  recording: "tour",
  // 클릭하면 바로 다음 frame부터 화면이 바뀌므로, 구간은 클릭 한 frame 전에 끝내고 다음 화면을 다 그린 뒤에서 잇습니다.
  clips: [
    { from: { ms: 0 }, to: { after: "open-plan", ms: -40 } },
    { from: { after: "plan-shown", ms: 250 }, to: { after: "open-checkout", ms: -40 } },
    { from: { after: "checkout-shown", ms: 150 }, to: { after: "open-decisions", ms: -40 } },
    { from: { after: "decisions-shown", ms: 200 }, to: { after: "open-replaced", ms: -40 } },
    { from: { after: "replaced-shown", ms: 100 }, to: { after: "replaced-shown", ms: 2700 } },
  ],
  focus: [
    // 에픽 화면 전체에서 상단 탭과 열린 에픽 카드를 보인 뒤, 순서 보기의 단계 열로 들어갑니다.
    { at: { ms: 0 }, ...FULL },
    { at: { after: "plan-shown", ms: 800 }, x: 40, y: 150, width: 880 },
    // 결제 화면 이슈의 상세를 읽은 뒤, 그림을 확대하는 dialog는 앱이 크게 보여 주므로 전체 화면으로 물러나 둡니다.
    { at: { after: "checkout-shown", ms: 700 }, x: 396, y: 80, width: 860 },
    { at: { after: "checkout-shown", ms: 2100 }, ...FULL },
    // 스크롤한 상세에서 Staging check 제목부터 결제 화면 스크린샷 아래의 녹화 링크까지 함께 들어오는 너비입니다.
    { at: { after: "close-diagram", ms: 550 }, x: 330, y: 146, width: 950 },
    { at: { after: "scroll-to-screenshot", ms: 1100 }, ...FULL },
    // 결정 목록은 Supersession 열까지 들어오는 너비로 봅니다. 상세가 열리면 Supersedes 링크를 누르기 전에 전체 화면으로 돌아가,
    // 이전 결정이 상세 옆 패널에 열리는 모습을 끝까지 전체 화면으로 보입니다.
    // 상세의 오른쪽 열만 확대하면 옆 패널이 상세 옆에 열린다는 관계가 드러나지 않고, 옆 패널이 열린 뒤에는 상세가 좁아지며
    // Linked issues가 화면 아래로 내려가므로 상세와 옆 패널을 함께 담으면서 확대할 영역이 없습니다.
    { at: { after: "decisions-shown", ms: 750 }, x: 28, y: 64, width: 972 },
    { at: { after: "decision-shown", ms: 200 }, ...FULL },
  ],
  captions: [
    { at: { ms: 0 }, title: "Plan", text: "See each epic's plan, stage by stage" },
    {
      at: { after: "open-checkout", ms: 0 },
      title: "Diagrams",
      text: "Open the diagrams they draw",
    },
    {
      at: { after: "scroll-to-screenshot", ms: 0 },
      title: "Screenshots",
      text: "See the screenshots they attach",
    },
    {
      at: { after: "open-decisions", ms: 0 },
      title: "Decisions",
      text: "Track decisions and what they replaced",
    },
  ],
};

/** 동작 이름으로 적은 시각을 녹화의 동작 기록으로 풀어, 녹화 시각으로 적은 Tour를 만듭니다. */
export function resolveTour(plan: TourPlan, events: RecordingEvent[]): Tour {
  const msOf = ({ after, ms }: Moment) => {
    if (after === undefined) return ms;
    const event = events.find(({ name }) => name === after);
    if (event === undefined) {
      throw new Error(
        `${plan.recording}.events.json에 ${after} 동작이 없습니다. captureTargets.ts의 동작 이름과 맞춥니다.`,
      );
    }
    return event.atMs + ms;
  };
  return {
    recording: plan.recording,
    clips: plan.clips.map(({ from, to }) => ({ fromMs: msOf(from), toMs: msOf(to) })),
    focus: plan.focus.map(({ at, ...area }) => ({ atMs: msOf(at), ...area })),
    captions: plan.captions.map(({ at, ...caption }) => ({ atMs: msOf(at), ...caption })),
  };
}

export function msToFrames(ms: number): number {
  return Math.round((ms * FPS) / 1000);
}

export function clipFrames(clip: Clip): number {
  return msToFrames(clip.toMs - clip.fromMs);
}

/** 영상에서 녹화 구간 하나가 놓이는 frame 구간입니다. */
export type Slot = { from: number; frames: number };

/** 항목을 이 순서로 겹치지 않게 이어 놓습니다. */
export function placeInOrder<T>(items: T[], framesOf: (item: T) => number): (T & Slot)[] {
  let from = 0;
  return items.map((item) => {
    const slot = { ...item, from, frames: framesOf(item) };
    from += slot.frames;
    return slot;
  });
}

/** 본편의 길이와, 본편이 끝나기 OUTRO_FADE_FRAMES 전부터 겹쳐 나타나는 설치 안내의 자리입니다. */
export function introSchedule(tour: Tour): { tour: Slot; outro: Slot; frames: number } {
  const tourFrames = tour.clips.reduce((sum, clip) => sum + clipFrames(clip), 0);
  const outro = { from: Math.max(tourFrames - OUTRO_FADE_FRAMES, 0), frames: OUTRO_FRAMES };
  return { tour: { from: 0, frames: tourFrames }, outro, frames: outro.from + outro.frames };
}

/** 본편의 `frame`번째 frame에 보이는 녹화 시각입니다. */
export function recordingMsAt(clips: Clip[], frame: number): number {
  const placed = placeInOrder(clips, clipFrames);
  const clip = placed.findLast(({ from }) => from <= frame) ?? placed[0];
  if (clip === undefined) return 0;
  return clip.fromMs + ((frame - clip.from) * 1000) / FPS;
}

/** 녹화 시각 ms가 본편에 보이는 시각(밀리초)입니다. 구간 사이에서 빼낸 시각이면, 그다음 구간이 시작하는 시각입니다. */
export function videoMsAt(clips: Clip[], ms: number): number {
  let elapsed = 0;
  for (const clip of clips) {
    if (ms < clip.fromMs) return elapsed;
    if (ms <= clip.toMs) return elapsed + ms - clip.fromMs;
    elapsed += clip.toMs - clip.fromMs;
  }
  return elapsed;
}

/** 자막이 나타난 뒤 다음 클릭까지 비워 둘 시간입니다. 짧은 자막도 CAPTION_MIN_MS는 둡니다. */
export function captionReadMs(caption: Caption): number {
  return Math.max(CAPTION_MIN_MS, (caption.text.length / CAPTION_CHARS_PER_SECOND) * 1000);
}

/**
 * 본편이 카메라와 자막 규칙을 어긴 곳을 문장으로 돌려줍니다. 시각은 구간 사이를 빼고 이어 붙인 영상 시각으로 셉니다.
 * - 확대 영역이 클릭 뒤 SCREEN_CHANGE_MS 안에 움직이면, 화면이 바뀌는 모습과 카메라 이동이 겹칩니다.
 * - 자막이 나타난 뒤 captionReadMs 안에 다음 동작이 있거나 확대 영역이 두 번 넘게 움직이면, 자막을 읽을 틈이 없습니다.
 * - 영상 길이가 INTRO_SECONDS 밖입니다.
 */
export function findTourProblems(tour: Tour, events: RecordingEvent[]): string[] {
  const at = (ms: number) => videoMsAt(tour.clips, ms);
  const seconds = (ms: number) => `${(at(ms) / 1000).toFixed(2)}초`;
  const actions = events.filter(({ kind }) => kind !== "mark");
  const moves = tour.focus.slice(1).map(({ atMs }) => atMs);
  const problems: string[] = [];

  for (const click of actions.filter(({ kind }) => kind === "click")) {
    for (const move of moves) {
      const overlaps =
        at(move) < at(click.atMs) + SCREEN_CHANGE_MS && at(move) + FOCUS_MOVE_MS > at(click.atMs);
      if (overlaps) {
        problems.push(
          `${seconds(move)}에 시작하는 확대 영역 이동이 ${click.name} 클릭(${seconds(click.atMs)}) 뒤 ${SCREEN_CHANGE_MS}ms 안에 걸립니다.`,
        );
      }
    }
  }

  for (const caption of tour.captions) {
    const quietUntil = at(caption.atMs) + captionReadMs(caption);
    const next = actions.find(({ atMs }) => atMs > caption.atMs);
    if (next !== undefined && at(next.atMs) < quietUntil) {
      problems.push(
        `"${caption.title}" 자막(${seconds(caption.atMs)}) 뒤 ${captionReadMs(caption)}ms가 지나기 전에 ${next.name}(${seconds(next.atMs)})이 있습니다.`,
      );
    }
    const movesWhileReading = moves.filter(
      (move) => at(move) >= at(caption.atMs) && at(move) < quietUntil,
    );
    if (movesWhileReading.length > 1) {
      problems.push(
        `"${caption.title}" 자막(${seconds(caption.atMs)})을 읽는 동안 확대 영역이 ${movesWhileReading.length}번 움직입니다.`,
      );
    }
  }

  const length = introSchedule(tour).frames / FPS;
  if (length < INTRO_SECONDS.min || length > INTRO_SECONDS.max) {
    problems.push(
      `영상 길이 ${length.toFixed(1)}초가 ${INTRO_SECONDS.min}–${INTRO_SECONDS.max}초 밖입니다.`,
    );
  }
  return problems;
}

/** 녹화 시각 ms에 보일 영역입니다. 옮겨 가는 동안에는 천천히 출발해 천천히 멈추고, 녹화 밖으로 나가지 않게 자릅니다. */
export function focusAt(focus: Focus[], ms: number): FocusArea {
  const index = focus.findLastIndex((area) => area.atMs <= ms);
  const target = focus[Math.max(index, 0)];
  if (target === undefined) return FULL;
  const previous = focus[index - 1];
  const progress = (ms - target.atMs) / FOCUS_MOVE_MS;
  if (previous === undefined || progress >= 1) return clampFocus(target);
  const eased = (1 - Math.cos(Math.PI * progress)) / 2;
  const between = (key: "x" | "y" | "width") =>
    previous[key] + (target[key] - previous[key]) * eased;
  return clampFocus({ x: between("x"), y: between("y"), width: between("width") });
}

function clampFocus({ x, y, width }: FocusArea): FocusArea {
  const { width: fullWidth, height: fullHeight } = RECORDING_SIZE;
  const clampedWidth = Math.min(width, fullWidth);
  const height = (clampedWidth * fullHeight) / fullWidth;
  return {
    x: Math.min(Math.max(x, 0), fullWidth - clampedWidth),
    y: Math.min(Math.max(y, 0), fullHeight - height),
    width: clampedWidth,
  };
}
