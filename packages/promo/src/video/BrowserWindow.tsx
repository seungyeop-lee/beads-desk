import { OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import {
  clipFrames,
  focusAt,
  FPS,
  msToFrames,
  placeInOrder,
  RECORDING_SIZE,
  type Clip,
  type Focus,
  type Tour,
} from "./introTimeline.ts";

const TITLE_BAR_HEIGHT = 30;

/**
 * 본편의 녹화 구간을 차례로 브라우저 창 모양 안에 녹화 크기 그대로 보입니다.
 * `zoom`이면 본편의 `focus` 영역을 창 크기로 확대합니다.
 */
export function BrowserWindow({ tour, zoom }: { tour: Tour; zoom: boolean }) {
  const clips = placeInOrder(tour.clips, clipFrames);
  return (
    <div
      style={{
        width: RECORDING_SIZE.width,
        borderRadius: 12,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 24px 60px rgba(28, 25, 23, 0.18), 0 0 0 1px rgba(28, 25, 23, 0.08)",
      }}
    >
      <TitleBar />
      <div style={{ ...RECORDING_SIZE, position: "relative", overflow: "hidden" }}>
        {clips.map((clip) => (
          <Sequence key={clip.fromMs} from={clip.from} durationInFrames={clip.frames} layout="none">
            <ClipVideo recording={tour.recording} clip={clip} focus={zoom ? tour.focus : []} />
          </Sequence>
        ))}
      </div>
    </div>
  );
}

function ClipVideo({ recording, clip, focus }: { recording: string; clip: Clip; focus: Focus[] }) {
  const ms = clip.fromMs + (useCurrentFrame() * 1000) / FPS;
  const { x, y, width } = focusAt(focus, ms);
  const scale = RECORDING_SIZE.width / width;
  return (
    <OffthreadVideo
      src={staticFile(`${recording}.webm`)}
      trimBefore={msToFrames(clip.fromMs)}
      muted
      style={{
        display: "block",
        ...RECORDING_SIZE,
        transformOrigin: "0 0",
        transform: `scale(${scale}) translate(${-x}px, ${-y}px)`,
      }}
    />
  );
}
function TitleBar() {
  return (
    <div
      style={{
        height: TITLE_BAR_HEIGHT,
        background: "#ece9e4",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 14px",
      }}
    >
      {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
        <span key={dot} style={{ width: 12, height: 12, borderRadius: 6, background: dot }} />
      ))}
    </div>
  );
}
