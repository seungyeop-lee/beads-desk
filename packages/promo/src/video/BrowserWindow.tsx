import { OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { cameraAt, FPS, msToFrames, RECORDING_SIZE, type Shot } from "./introTimeline.ts";

export const TITLE_BAR_HEIGHT = 30;

/** 녹화 구간을 브라우저 창 모양 안에 `scale`배로 줄여 보이고, 장면의 확대 상태를 적용합니다. */
export function BrowserWindow({
  shot,
  video,
  scale,
}: {
  shot: Shot;
  video: string;
  scale: number;
}) {
  const frame = useCurrentFrame();
  const camera = cameraAt(shot.cameras, shot.fromMs + (frame * 1000) / FPS);
  return (
    <div
      style={{
        width: RECORDING_SIZE.width * scale,
        borderRadius: 12,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 24px 60px rgba(28, 25, 23, 0.18), 0 0 0 1px rgba(28, 25, 23, 0.08)",
      }}
    >
      <TitleBar color="#ece9e4" />
      <div
        style={{
          width: RECORDING_SIZE.width * scale,
          height: RECORDING_SIZE.height * scale,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            ...RECORDING_SIZE,
            transformOrigin: "0 0",
            transform: `scale(${scale})`,
          }}
        >
          <OffthreadVideo
            src={staticFile(video)}
            trimBefore={msToFrames(shot.fromMs)}
            muted
            style={{
              ...RECORDING_SIZE,
              display: "block",
              transformOrigin: `${camera.origin.x}px ${camera.origin.y}px`,
              transform: `scale(${camera.scale})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function TitleBar({ color, title }: { color: string; title?: string }) {
  return (
    <div
      style={{
        height: TITLE_BAR_HEIGHT,
        background: color,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 14px",
        position: "relative",
      }}
    >
      {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
        <span key={dot} style={{ width: 12, height: 12, borderRadius: 6, background: dot }} />
      ))}
      {title ? (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#a8a29e",
          }}
        >
          {title}
        </span>
      ) : null}
    </div>
  );
}
