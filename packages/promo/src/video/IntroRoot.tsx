import { Composition, type CalculateMetadataFunction } from "remotion";
import {
  FPS,
  HERO_ID,
  heroShot,
  INTRO_ID,
  introFrames,
  shotFrames,
  VIDEO_SIZE,
} from "./introTimeline.ts";
import { HeroVideo, IntroVideo, type IntroProps } from "./IntroVideo.tsx";

/** 영상 길이는 렌더링 명령이 넘긴 captureLog.json의 bd 명령 시각에 따라 달라집니다. */
const introMetadata: CalculateMetadataFunction<IntroProps> = ({ props }) => ({
  durationInFrames: introFrames(props.log),
});
const heroMetadata: CalculateMetadataFunction<IntroProps> = ({ props }) => ({
  durationInFrames: shotFrames(heroShot(props.log)),
});

/** 녹화가 없으면 장면을 만들 수 없으므로, 기본값은 비워 두고 렌더링 명령이 captureLog.json을 넘깁니다. */
const NO_CAPTURE: IntroProps = {
  log: { capturedAt: "", viewport: VIDEO_SIZE, deviceScaleFactor: 1, scenes: [] },
};

export function IntroRoot() {
  return (
    <>
      <Composition
        id={INTRO_ID}
        component={IntroVideo}
        fps={FPS}
        {...VIDEO_SIZE}
        defaultProps={NO_CAPTURE}
        calculateMetadata={introMetadata}
      />
      <Composition
        id={HERO_ID}
        component={HeroVideo}
        fps={FPS}
        {...VIDEO_SIZE}
        defaultProps={NO_CAPTURE}
        calculateMetadata={heroMetadata}
      />
    </>
  );
}
