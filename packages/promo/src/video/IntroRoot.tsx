import { Composition } from "remotion";
import { FPS, INTRO_ID, introSchedule, TOUR, VIDEO_SIZE } from "./introTimeline.ts";
import { IntroVideo, type IntroProps } from "./IntroVideo.tsx";

/** 렌더링 명령은 녹화의 동작 기록으로 푼 본편을 넘깁니다. 이 값은 composition 정의에만 쓰는 빈 본편입니다. */
const DEFAULT_PROPS: IntroProps = {
  zoom: false,
  tour: { recording: TOUR.recording, clips: [], focus: [], captions: [] },
};

export function IntroRoot() {
  return (
    <Composition
      id={INTRO_ID}
      component={IntroVideo}
      fps={FPS}
      {...VIDEO_SIZE}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={({ props }) => ({ durationInFrames: introSchedule(props.tour).frames })}
    />
  );
}
