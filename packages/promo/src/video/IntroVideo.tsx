import type { ReactNode } from "react";
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame } from "remotion";
import { BrowserWindow } from "./BrowserWindow.tsx";
import {
  GIF_FRAME_STEP,
  introSchedule,
  OUTRO_FADE_FRAMES,
  recordingMsAt,
  type CaptionCue,
  type Tour,
} from "./introTimeline.ts";

const BACKGROUND = "#efece6";
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
/** 자막 띠의 높이입니다. 화면 위쪽 이 높이에는 창을 두지 않아, 자막이 녹화를 가리지 않습니다. */
const CAPTION_HEIGHT = 120;

export type IntroProps = {
  /** README GIF처럼 줄여 보이는 영상에서, 장면마다 보여 줄 영역을 확대합니다. */
  zoom: boolean;
  /** 녹화의 동작 기록으로 시각을 푼 본편입니다. 렌더링 명령이 넘깁니다. */
  tour: Tour;
};

/**
 * 녹화 하나를 이어 붙인 본편 뒤에 설치 안내를 겹쳐 보이는 소개 영상입니다.
 * 본편은 배경색으로 흐려지지 않고 시작하며, 끝에서는 본편의 첫 frame으로 바뀌어 GIF가 이음매 없이 반복됩니다.
 */
export function IntroVideo({ zoom, tour }: IntroProps) {
  const schedule = introSchedule(tour);
  return (
    <AbsoluteFill style={{ background: BACKGROUND, fontFamily: FONT }}>
      <Sequence durationInFrames={schedule.tour.frames}>
        <TourScene tour={tour} zoom={zoom} />
      </Sequence>
      <Sequence from={schedule.outro.from} durationInFrames={schedule.outro.frames}>
        <FadeIn>
          <Outro />
        </FadeIn>
      </Sequence>
      {/* README GIF는 GIF_FRAME_STEP frame마다 하나만 쓰므로, 다 나타난 첫 frame을 마지막 GIF_FRAME_STEP frame 동안 둡니다. */}
      <Sequence
        from={schedule.frames - OUTRO_FADE_FRAMES - GIF_FRAME_STEP + 1}
        durationInFrames={OUTRO_FADE_FRAMES + GIF_FRAME_STEP - 1}
      >
        <FadeIn>
          <Freeze frame={0}>
            <TourScene tour={tour} zoom={zoom} />
          </Freeze>
        </FadeIn>
      </Sequence>
    </AbsoluteFill>
  );
}

function TourScene({ tour, zoom }: { tour: Tour; zoom: boolean }) {
  const ms = recordingMsAt(tour.clips, useCurrentFrame());
  const index = tour.captions.findLastIndex((caption) => caption.atMs <= ms);
  const caption = tour.captions[index];
  return (
    <AbsoluteFill style={{ background: BACKGROUND }}>
      <div style={{ height: CAPTION_HEIGHT }}>
        {caption && <CaptionBand caption={caption} step={index + 1} />}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BrowserWindow tour={tour} zoom={zoom} />
      </div>
    </AbsoluteFill>
  );
}

/** 장면 순서 번호와 이름을 담은 chip 옆에 자막을 한 줄로 보입니다. */
function CaptionBand({ caption, step }: { caption: CaptionCue; step: number }) {
  return (
    <div
      style={{
        height: "100%",
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
        {step} {caption.title}
      </span>
      <span>{caption.text}</span>
    </div>
  );
}

function Outro() {
  return (
    <AbsoluteFill
      style={{
        background: BACKGROUND,
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        color: "#1c1917",
        // 본편의 창과 같은 높이에 가운데를 맞춥니다.
        paddingTop: CAPTION_HEIGHT,
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

/** 처음 OUTRO_FADE_FRAMES 동안 아래 화면 위로 나타납니다. */
function FadeIn({ children }: { children: ReactNode }) {
  const opacity = interpolate(useCurrentFrame(), [0, OUTRO_FADE_FRAMES - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}
