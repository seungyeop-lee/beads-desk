import type { CaptureLog, SceneLog } from "../capture/captureLog.ts";

/** Playwright 녹화가 25fps라서, 영상도 25fps로 만들어 녹화의 frame을 하나씩 그대로 씁니다. */
export const FPS = 25;
/**
 * 녹화는 1440×900(1배율)입니다. 기능 장면은 브라우저를 0.8배로 줄여 놓고 최대 1.25배까지 확대하므로,
 * 확대해도 녹화의 1픽셀이 영상의 1픽셀보다 커지지 않습니다.
 */
export const VIDEO_SIZE = { width: 1600, height: 900 };
export const RECORDING_SIZE = { width: 1440, height: 900 };
/** 렌더링 명령이 고르는 composition입니다. 전체 소개 영상과, README GIF로 쓰는 hero 장면입니다. */
export const INTRO_ID = "intro";
export const HERO_ID = "intro-hero";
/** 장면이 바뀔 때 앞 장면이 흐려지고 다음 장면이 나타나는 시간입니다. */
export const FADE_FRAMES = 8;
export const OUTRO_FRAMES = 3 * FPS;

/** 녹화를 확대하는 상태입니다. 녹화 좌표의 `origin`을 고정점으로 `scale`배 확대합니다. */
export type Camera = { scale: number; origin: { x: number; y: number } };
/** 녹화 시각 `atMs`부터 `moveMs`(기본 CAMERA_MOVE_MS) 동안 앞 상태에서 이 상태로 옮겨 갑니다. */
export type CameraKey = Camera & { atMs: number; moveMs?: number };

const CAMERA_MOVE_MS = 900;
const FULL_VIEW: Camera = {
  scale: 1,
  origin: { x: RECORDING_SIZE.width / 2, y: RECORDING_SIZE.height / 2 },
};

export type Caption = { title: string; text: string };

/** 녹화 하나에서 잘라 쓰는 구간입니다. 시각은 모두 그 녹화의 시작부터 지난 밀리초입니다. */
export type Shot = {
  /** captureLog.json의 장면 이름입니다. */
  recording: string;
  fromMs: number;
  toMs: number;
  caption: Caption;
  cameras: CameraKey[];
};

/** hero에서 터미널에 bd 명령을 입력한 뒤, 마지막 결과가 화면에 나타나고 나서 머무는 시간입니다. */
const HERO_HOLD_MS = 2000;
const HERO_RECORDING = "live-updates";
const HERO_CAPTION: Caption = {
  title: "Live updates",
  text: "Change issues with bd in your terminal, and the board follows.",
};
/**
 * 보드의 Ready, In progress, Closed 열로 확대합니다. hero의 bd 명령이 바꾸는 카드가 모두 이 열에 있습니다.
 * 위쪽 머리글 대신 열 아래쪽의 카드까지 보이도록, 녹화의 y 120 부근부터 보입니다.
 */
const HERO_CAMERA: Camera = { scale: 1.35, origin: { x: 1440, y: 470 } };

/**
 * hero 뒤에 이어 붙이는 기능 장면입니다.
 * 구간은 captureTargets.ts의 동작과 pause 길이로 정해진 녹화 시각에 맞춘 값이므로, 장면의 동작을 바꾸면 함께 고칩니다.
 */
export const FEATURE_SHOTS: Shot[] = [
  {
    // 첫 pause가 끝나면 In progress 목록 위로 포인터가 옮겨 가 스크롤합니다.
    recording: "now",
    fromMs: 600,
    toMs: 6000,
    caption: { title: "Now", text: "What is in progress, up next, and blocked, at a glance." },
    cameras: [],
  },
  {
    // Epics 화면이 열린 뒤부터 씁니다. View order를 클릭하면 약 6.6초에 그래프가 그려집니다.
    // 확대한 상태에서 그래프 창 아래의 어두운 배경이 보이지 않도록, 녹화의 y 150~870만 보입니다.
    recording: "graph",
    fromMs: 3000,
    toMs: 10100,
    caption: { title: "Graph", text: "See which work can run in parallel, stage by stage." },
    cameras: [
      { atMs: 6600, scale: 1.25, origin: { x: 300, y: 760 } },
      // 확대하면 그래프의 양 끝이 화면 밖으로 나가므로, 첫 단계부터 마지막 단계까지 천천히 옮겨 갑니다.
      { atMs: 7600, moveMs: 2000, scale: 1.25, origin: { x: 1065, y: 760 } },
    ],
  },
  {
    // Board 화면이 열린 뒤부터 씁니다. 약 6.9초에 Blocked 열을 끝까지 스크롤합니다.
    recording: "board",
    fromMs: 3400,
    toMs: 9600,
    caption: {
      title: "Board",
      text: "Blocked, Ready, In progress, and Closed on one kanban board.",
    },
    cameras: [],
  },
  {
    // Needs human 화면의 목록이 나타난 뒤부터 씁니다. 약 5.1초에 질문을 클릭해 오른쪽에 내용을 엽니다.
    recording: "needs-human",
    fromMs: 3900,
    toMs: 9200,
    caption: {
      title: "Needs human",
      text: "Answer the questions and gates your agents hand to you.",
    },
    cameras: [],
  },
];

/** 터미널에 보일 bd 명령 하나입니다. 시각은 hero 녹화의 시각입니다. */
export type TerminalCommand = {
  text: string;
  typeFromMs: number;
  /** Enter를 누르는 시각입니다. 녹화하는 동안 bd를 실행하기 시작한 시각과 같습니다. */
  enterMs: number;
  outputMs: number;
  output: string;
};

/** 한 글자를 입력하는 시간입니다. 앞 명령의 출력과 겹치면 더 빨리 입력합니다. */
const TYPE_MS_PER_CHAR = 45;
/** 앞 명령의 출력이 나온 뒤 다음 명령을 입력하기 시작하기까지 최소한 기다리는 시간입니다. */
const TYPE_GAP_MS = 400;

export type Hero = Shot & { commands: TerminalCommand[] };

export function heroShot(log: CaptureLog): Hero {
  const scene = findScene(log, HERO_RECORDING);
  const commands = terminalCommands(scene);
  const last = scene.bdCommands.at(-1);
  if (!last) throw new Error(`${HERO_RECORDING} 장면에 bd 명령 기록이 없습니다.`);
  return {
    recording: HERO_RECORDING,
    fromMs: 0,
    toMs: last.shownMs + HERO_HOLD_MS,
    caption: HERO_CAPTION,
    // 처음에는 보드 전체를 보이고, 첫 명령을 입력하는 동안 결과가 나타날 열로 다가갑니다.
    cameras: [{ atMs: commands[0]!.typeFromMs, ...HERO_CAMERA }],
    commands,
  };
}

export function findScene(log: CaptureLog, name: string): SceneLog {
  const scene = log.scenes.find((candidate) => candidate.name === name);
  if (!scene) throw new Error(`captureLog.json에 ${name} 장면이 없습니다. 캡처를 다시 실행합니다.`);
  return scene;
}

/** 명령을 Enter 시각에 다 입력하도록 입력 시작 시각을 앞당기되, 앞 명령의 출력보다 먼저 입력하지는 않습니다. */
export function terminalCommands(scene: SceneLog): TerminalCommand[] {
  let readyMs = 0;
  return scene.bdCommands.map((command) => {
    const text = formatBdCommand(command.args);
    const typeFromMs = Math.min(
      command.startMs,
      Math.max(readyMs, command.startMs - text.length * TYPE_MS_PER_CHAR),
    );
    readyMs = command.endMs + TYPE_GAP_MS;
    return {
      text,
      typeFromMs,
      enterMs: command.startMs,
      outputMs: command.endMs,
      output: command.stdout.trimEnd(),
    };
  });
}

export type TerminalLine = { prompt: boolean; text: string };
/** `cursor`는 커서를 둘 곳입니다. 명령을 실행하는 동안에는 프롬프트 없는 다음 줄에, 입력을 기다리는 동안에는 깜박이며 줄 끝에 둡니다. */
export type TerminalScreen = { lines: TerminalLine[]; cursor: "typing" | "running" | "idle" };

/** 녹화 시각 `ms`에 터미널에 보일 내용입니다. */
export function terminalScreen(commands: TerminalCommand[], ms: number): TerminalScreen {
  const lines: TerminalLine[] = [];
  for (const command of commands) {
    if (ms < command.typeFromMs) break;
    const typedMs = command.enterMs - command.typeFromMs;
    const progress = typedMs > 0 ? Math.min(1, (ms - command.typeFromMs) / typedMs) : 1;
    const typed = command.text.slice(0, Math.floor(command.text.length * progress));
    lines.push({ prompt: true, text: typed });
    if (ms < command.enterMs) return { lines, cursor: "typing" };
    if (ms < command.outputMs) return { lines, cursor: "running" };
    lines.push({ prompt: false, text: command.output });
  }
  lines.push({ prompt: true, text: "" });
  return { lines, cursor: "idle" };
}

/** captureLog.ts의 약속대로, 공백이 든 인자는 큰따옴표로 감싸 사람이 입력한 모양으로 보입니다. */
export function formatBdCommand(args: string[]): string {
  return ["bd", ...args].map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(" ");
}

export function msToFrames(ms: number): number {
  return Math.round((ms * FPS) / 1000);
}

export function shotFrames(shot: Shot): number {
  return msToFrames(shot.toMs - shot.fromMs);
}

/** 영상에서 장면 하나가 놓이는 frame 구간입니다. */
export type Slot = { from: number; frames: number };
export type IntroSchedule = {
  hero: Hero & Slot;
  features: (Shot & Slot)[];
  outro: Slot;
};

/** hero, 기능 장면, 설치 안내를 이 순서로 겹치지 않게 이어 붙입니다. */
export function introSchedule(log: CaptureLog): IntroSchedule {
  const hero = heroShot(log);
  let from = shotFrames(hero);
  const features = FEATURE_SHOTS.map((shot) => {
    const slot = { ...shot, from, frames: shotFrames(shot) };
    from += slot.frames;
    return slot;
  });
  return {
    hero: { ...hero, from: 0, frames: shotFrames(hero) },
    features,
    outro: { from, frames: OUTRO_FRAMES },
  };
}

export function introFrames(log: CaptureLog): number {
  const { outro } = introSchedule(log);
  return outro.from + outro.frames;
}

/** 녹화 시각 `ms`에 보일 확대 상태입니다. 다음 key로 옮겨 가는 동안에는 천천히 출발해 천천히 멈춥니다. */
export function cameraAt(keys: CameraKey[], ms: number): Camera {
  let camera = FULL_VIEW;
  for (const key of keys) {
    if (ms <= key.atMs) break;
    const progress = easeInOut(Math.min(1, (ms - key.atMs) / (key.moveMs ?? CAMERA_MOVE_MS)));
    camera = {
      scale: mix(camera.scale, key.scale, progress),
      origin: {
        x: mix(camera.origin.x, key.origin.x, progress),
        y: mix(camera.origin.y, key.origin.y, progress),
      },
    };
  }
  return camera;
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function easeInOut(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}
