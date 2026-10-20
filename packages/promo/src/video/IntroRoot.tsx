import { Composition } from "remotion";
import { FPS, INTRO_FRAMES, INTRO_ID, VIDEO_SIZE } from "./introTimeline.ts";
import { IntroVideo, type IntroProps } from "./IntroVideo.tsx";

const DEFAULT_PROPS: IntroProps = { zoom: false };

export function IntroRoot() {
  return (
    <Composition
      id={INTRO_ID}
      component={IntroVideo}
      fps={FPS}
      durationInFrames={INTRO_FRAMES}
      {...VIDEO_SIZE}
      defaultProps={DEFAULT_PROPS}
    />
  );
}
