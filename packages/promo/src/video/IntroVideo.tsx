import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { BrowserWindow } from "./BrowserWindow.tsx";
import {
  FADE_FRAMES,
  INTRO_SCHEDULE,
  VIDEO_SIZE,
  type Caption,
  type Slot,
} from "./introTimeline.ts";

const BACKGROUND = "#efece6";
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
/** 자막 띠의 높이입니다. 화면 아래쪽 이 높이에는 창을 두지 않아, 자막이 녹화를 가리지 않습니다. */
const CAPTION_HEIGHT = 110;
const BROWSER_SCALE = 0.8;

/** 장면을 차례로 이어 붙이고 마지막에 설치 안내를 보이는 소개 영상입니다. */
export function IntroVideo() {
  const { shots, outro } = INTRO_SCHEDULE;
  return (
    <AbsoluteFill style={{ background: BACKGROUND, fontFamily: FONT }}>
      {shots.map((shot) => (
        <FadingSequence key={shot.recording} slot={shot}>
          <SceneLayout caption={shot.caption}>
            <BrowserWindow shot={shot} scale={BROWSER_SCALE} />
          </SceneLayout>
        </FadingSequence>
      ))}
      <FadingSequence slot={outro}>
        <Outro />
      </FadingSequence>
    </AbsoluteFill>
  );
}

function SceneLayout({ caption, children }: { caption: Caption; children: ReactNode }) {
  return (
    <AbsoluteFill>
      <div
        style={{
          height: VIDEO_SIZE.height - CAPTION_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
      <div
        style={{
          height: CAPTION_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          fontSize: 30,
          color: "#1c1917",
        }}
      >
        <span
          style={{
            padding: "6px 16px",
            borderRadius: 999,
            background: "#1c1917",
            color: "#fafaf9",
            fontWeight: 600,
            fontSize: 24,
          }}
        >
          {caption.title}
        </span>
        <span>{caption.text}</span>
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        color: "#1c1917",
        paddingBottom: CAPTION_HEIGHT / 2,
      }}
    >
      <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -1 }}>beads-desk</div>
      <div style={{ fontSize: 34, color: "#57534e" }}>A local web UI for Beads (bd)</div>
      <div
        style={{
          marginTop: 12,
          padding: "16px 28px",
          borderRadius: 12,
          background: "#1c1917",
          color: "#e7e5e4",
          fontFamily: '"SF Mono", Menlo, Monaco, monospace',
          fontSize: 28,
        }}
      >
        npm install -g @seungyeop-lee/beads-desk
      </div>
    </AbsoluteFill>
  );
}

function FadingSequence({ slot, children }: { slot: Slot; children: ReactNode }) {
  return (
    <Sequence from={slot.from} durationInFrames={slot.frames}>
      <Fade frames={slot.frames}>{children}</Fade>
    </Sequence>
  );
}

/** 장면의 처음과 끝에서 배경으로부터 나타나고 배경으로 사라집니다. */
function Fade({ frames, children }: { frames: number; children: ReactNode }) {
  const opacity = interpolate(
    useCurrentFrame(),
    [0, FADE_FRAMES, frames - FADE_FRAMES, frames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}
