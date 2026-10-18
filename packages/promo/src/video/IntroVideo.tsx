import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import type { CaptureLog } from "../capture/captureLog.ts";
import { BrowserWindow, TITLE_BAR_HEIGHT } from "./BrowserWindow.tsx";
import {
  FADE_FRAMES,
  findScene,
  heroShot,
  introSchedule,
  RECORDING_SIZE,
  shotFrames,
  VIDEO_SIZE,
  type Caption,
  type Hero,
  type Shot,
  type Slot,
} from "./introTimeline.ts";
import { Terminal } from "./Terminal.tsx";

export type IntroProps = { log: CaptureLog };

const BACKGROUND = "#efece6";
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const MARGIN = 40;
/** 자막 띠의 높이입니다. 화면 아래쪽 이 높이에는 창을 두지 않아, 자막이 녹화를 가리지 않습니다. */
const CAPTION_HEIGHT = 110;
const TERMINAL_WIDTH = 500;
const HERO_GAP = 28;
const HERO_BROWSER_SCALE =
  (VIDEO_SIZE.width - MARGIN * 2 - TERMINAL_WIDTH - HERO_GAP) / RECORDING_SIZE.width;
const FEATURE_BROWSER_SCALE = 0.8;

/** hero, 기능 장면, 마지막 설치 안내를 차례로 이어 붙인 소개 영상입니다. */
export function IntroVideo({ log }: IntroProps) {
  const { hero, features, outro } = introSchedule(log);
  return (
    <AbsoluteFill style={{ background: BACKGROUND, fontFamily: FONT }}>
      <FadingSequence slot={hero}>
        <HeroScene hero={hero} log={log} />
      </FadingSequence>
      {features.map((shot) => (
        <FadingSequence key={shot.recording} slot={shot}>
          <FeatureScene shot={shot} log={log} />
        </FadingSequence>
      ))}
      <FadingSequence slot={outro}>
        <Outro />
      </FadingSequence>
    </AbsoluteFill>
  );
}

/** README GIF로 쓰는 hero 장면만의 영상입니다. */
export function HeroVideo({ log }: IntroProps) {
  const hero = heroShot(log);
  return (
    <AbsoluteFill style={{ background: BACKGROUND, fontFamily: FONT }}>
      <Fade frames={shotFrames(hero)}>
        <HeroScene hero={hero} log={log} />
      </Fade>
    </AbsoluteFill>
  );
}

function HeroScene({ hero, log }: { hero: Hero; log: CaptureLog }) {
  const windowHeight = RECORDING_SIZE.height * HERO_BROWSER_SCALE + TITLE_BAR_HEIGHT;
  return (
    <SceneLayout caption={hero.caption}>
      <div style={{ display: "flex", gap: HERO_GAP }}>
        <Terminal
          commands={hero.commands}
          fromMs={hero.fromMs}
          width={TERMINAL_WIDTH}
          height={windowHeight}
        />
        <BrowserWindow
          shot={hero}
          video={findScene(log, hero.recording).video}
          scale={HERO_BROWSER_SCALE}
        />
      </div>
    </SceneLayout>
  );
}

function FeatureScene({ shot, log }: { shot: Shot; log: CaptureLog }) {
  return (
    <SceneLayout caption={shot.caption}>
      <BrowserWindow
        shot={shot}
        video={findScene(log, shot.recording).video}
        scale={FEATURE_BROWSER_SCALE}
      />
    </SceneLayout>
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
