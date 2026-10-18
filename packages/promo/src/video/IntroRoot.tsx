import { Composition } from "remotion";
import { FPS, INTRO_FRAMES, INTRO_ID, VIDEO_SIZE } from "./introTimeline.ts";
import { IntroVideo } from "./IntroVideo.tsx";

export function IntroRoot() {
  return (
    <Composition
      id={INTRO_ID}
      component={IntroVideo}
      fps={FPS}
      durationInFrames={INTRO_FRAMES}
      {...VIDEO_SIZE}
    />
  );
}
