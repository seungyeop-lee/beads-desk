import { useGsapTimeline } from "@remotion/gsap";
import { OffthreadVideo, Sequence, staticFile } from "remotion";
import {
  clipFrames,
  FOCUS_MOVE_MS,
  msToFrames,
  placeInOrder,
  RECORDING_SIZE,
  SPOTLIGHT_FADE_MS,
  videoMsAt,
  type Tour,
} from "./introTimeline.ts";

const TITLE_BAR_HEIGHT = 30;

export function BrowserWindow({ tour }: { tour: Tour }) {
  const scope = useGsapTimeline<HTMLDivElement>(
    ({ timeline, selector }) => {
      const camera = selector("[data-camera]");
      for (const [index, { atMs, x, y, width }] of tour.focus.entries()) {
        const scale = RECORDING_SIZE.width / width;
        const pose = { scale, x: -x * scale, y: -y * scale };
        if (index === 0) timeline.set(camera, pose, 0);
        else
          timeline.to(
            camera,
            { ...pose, duration: FOCUS_MOVE_MS / 1000, ease: "sine.inOut" },
            videoMsAt(tour.clips, atMs) / 1000,
          );
      }
      for (const [index, { atMs, durationMs }] of tour.spotlights.entries()) {
        const mask = selector(`[data-spotlight="${index}"]`);
        const start = videoMsAt(tour.clips, atMs) / 1000;
        const fade = SPOTLIGHT_FADE_MS / 1000;
        timeline
          .to(mask, { opacity: 1, duration: fade, ease: "sine.inOut" }, start)
          .to(
            mask,
            { opacity: 0, duration: fade, ease: "sine.inOut" },
            start + durationMs / 1000 - fade,
          );
      }
    },
    { dependencies: [tour] },
  );
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
      <div ref={scope} style={{ ...RECORDING_SIZE, position: "relative", overflow: "hidden" }}>
        <div data-camera style={{ ...RECORDING_SIZE, transformOrigin: "0 0" }}>
          {clips.map((clip) => (
            <Sequence
              key={clip.fromMs}
              from={clip.from}
              durationInFrames={clip.frames}
              layout="none"
            >
              <OffthreadVideo
                src={staticFile(`${tour.recording}.webm`)}
                trimBefore={msToFrames(clip.fromMs)}
                muted
                style={{ display: "block", ...RECORDING_SIZE }}
              />
            </Sequence>
          ))}
          {tour.spotlights.map(({ atMs, box }, index) => (
            <div
              key={atMs}
              data-spotlight={index}
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
                borderRadius: 8,
                opacity: 0,
                boxShadow: `0 0 0 ${RECORDING_SIZE.width}px rgba(28, 25, 23, 0.22)`,
              }}
            />
          ))}
        </div>
      </div>
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
