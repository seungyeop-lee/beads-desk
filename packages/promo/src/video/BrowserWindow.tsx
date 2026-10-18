import { OffthreadVideo, Sequence, staticFile } from "remotion";
import {
  clipFrames,
  msToFrames,
  placeInOrder,
  RECORDING_WIDTH,
  type Shot,
} from "./introTimeline.ts";

const TITLE_BAR_HEIGHT = 30;

/** 장면의 녹화 구간을 차례로 브라우저 창 모양 안에 `scale`배로 줄여 보입니다. 창의 높이는 녹화의 비율을 따릅니다. */
export function BrowserWindow({ shot, scale }: { shot: Shot; scale: number }) {
  const width = RECORDING_WIDTH * scale;
  const clips = placeInOrder(shot.clips, clipFrames);
  return (
    <div
      style={{
        width,
        borderRadius: 12,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 24px 60px rgba(28, 25, 23, 0.18), 0 0 0 1px rgba(28, 25, 23, 0.08)",
      }}
    >
      <TitleBar />
      {clips.map((clip) => (
        <Sequence key={clip.fromMs} from={clip.from} durationInFrames={clip.frames} layout="none">
          <OffthreadVideo
            src={staticFile(`${shot.recording}.webm`)}
            trimBefore={msToFrames(clip.fromMs)}
            muted
            style={{ display: "block", width }}
          />
        </Sequence>
      ))}
    </div>
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
