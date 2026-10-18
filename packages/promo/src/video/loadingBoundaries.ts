import { clipFrames, FPS, msToFrames, type Clip, type Shot } from "./introTimeline.ts";
import type { Frame } from "./recordingFrames.ts";

/**
 * 경계 frame과 비교할 구간 안쪽의 길이입니다.
 * 장면의 동작(클릭, 스크롤)이 이 안에서 화면을 바꾸면 로딩으로 잘못 알리므로, 지금 녹화에서 경계와 첫 동작 사이(1.3초 이상)보다 짧게 둡니다.
 * 목록이 빈 채 불러오는 시간(약 1.5초)보다도 짧아서, 경계가 빈 목록이 나타나고 약 0.5초 안에 걸리면 잡지 못합니다.
 */
const WINDOW_FRAMES = msToFrames(1000);
/** 불러온 뒤의 화면은 그대로 남으므로, 안쪽 frame을 모두 읽지 않고 이 간격으로 골라 읽습니다. */
const SAMPLE_STEP = 5;
/** 밝기가 이 값보다 크게 달라진 픽셀만 바뀐 픽셀로 셉니다. 멈춘 화면에서 영상 압축이 만드는 차이는 이보다 작습니다. */
const PIXEL_TOLERANCE = 24;
/**
 * 경계 frame과 안쪽 frame에서 밝기가 달라진 픽셀이 이 비율을 넘으면 경계가 로딩 중인 화면에 걸렸다고 봅니다.
 * 포인터가 옮겨 가며 바꾸는 픽셀은 0.1% 아래이고, 보드가 human gate 제목을 그리며 카드를 밀어 내는 변화는 약 2%,
 * 상세 패널의 spinner가 설명 글로 바뀌는 변화는 약 0.5%입니다.
 */
const LOADING_CHANGE = 0.003;

export type ReadFrames = (recording: string, frames: number[]) => Promise<Map<number, Frame>>;

type Edge = "fromMs" | "toMs";
const EDGES: Edge[] = ["fromMs", "toMs"];

/**
 * 장면마다 각 녹화 구간의 첫 frame과 마지막 frame을, 구간 안쪽 1초 동안의 frame과 비교합니다.
 * 크게 다른 frame이 있으면 장면과 경계를 적은 문장을 돌려줍니다. 경계가 화면을 불러오는 동안에 걸렸거나,
 * 경계에서 1초 안에 장면의 동작이 화면을 바꾼 경우입니다.
 */
export async function findLoadingBoundaries(shots: Shot[], read: ReadFrames): Promise<string[]> {
  const problems: string[] = [];
  for (const shot of shots) {
    const boundaries = shot.clips.flatMap((clip, index) =>
      EDGES.map((edge) => ({ clip, index, edge, frames: boundaryFrames(clip, edge) })),
    );
    const frames = await read(shot.recording, [...new Set(boundaries.flatMap((b) => b.frames))]);
    for (const {
      clip,
      index,
      edge,
      frames: [boundary, ...inward],
    } of boundaries) {
      const changedAt = inward.find(
        (frame) => changedShare(frames.get(boundary!)!, frames.get(frame)!) > LOADING_CHANGE,
      );
      if (changedAt === undefined) continue;
      problems.push(
        `"${shot.caption.title}" 장면(${shot.recording}.webm)의 ${index + 1}번째 구간 ${edge} ${clip[edge]}: ` +
          `경계 frame이 구간 안쪽 ${frameMs(changedAt)}ms의 화면과 다릅니다.`,
      );
    }
  }
  return problems;
}

/** 경계 frame을 맨 앞에 두고, 구간 안쪽으로 1초 안에서 고른 frame을 경계에서 가까운 순서로 잇습니다. */
function boundaryFrames(clip: Clip, edge: Edge): number[] {
  // 영상은 구간의 시작 frame부터 clipFrames만큼 쓰므로, 마지막 frame도 같은 계산으로 정합니다.
  const first = msToFrames(clip.fromMs);
  const last = first + clipFrames(clip) - 1;
  const [boundary, direction, limit] = edge === "fromMs" ? [first, 1, last] : [last, -1, first];
  const reach = Math.min(WINDOW_FRAMES, Math.abs(limit - boundary));
  const frames = [boundary];
  for (let offset = SAMPLE_STEP; offset < reach; offset += SAMPLE_STEP) {
    frames.push(boundary + direction * offset);
  }
  if (reach > 0) frames.push(boundary + direction * reach);
  return frames;
}

/** 두 frame에서 밝기가 압축 오차보다 크게 달라진 픽셀의 비율입니다. */
function changedShare(a: Frame, b: Frame): number {
  let changed = 0;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i]! - b[i]!) > PIXEL_TOLERANCE) changed++;
  }
  return changed / a.length;
}

function frameMs(frame: number): number {
  return Math.round((frame * 1000) / FPS);
}
