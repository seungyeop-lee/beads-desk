"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

interface HeroVideoCardProps {
  videoLabel: string;
  videoCaption: string;
  pauseLabel: string;
  playLabel: string;
  pauseAriaLabel: string;
  playAriaLabel: string;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export function HeroVideoCard({
  videoLabel,
  videoCaption,
  pauseLabel,
  playLabel,
  pauseAriaLabel,
  playAriaLabel,
}: HeroVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const [manualPlayback, setManualPlayback] = useState<"playing" | "paused" | null>(null);
  const isPaused = manualPlayback !== null ? manualPlayback === "paused" : prefersReducedMotion;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 동작 감소 설정이 켜진 환경에서는 자동 재생을 멈추고 사용자가 재생 버튼을 누를 때만 재생합니다.
    if (prefersReducedMotion && manualPlayback === null) {
      video.autoplay = false;
      video.pause();
    }
  }, [prefersReducedMotion, manualPlayback]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setManualPlayback("playing");
      try {
        await video.play();
      } catch {
        setManualPlayback("paused");
      }
      return;
    }

    video.pause();
    setManualPlayback("paused");
  }

  return (
    <figure className="site-card overflow-hidden border-[var(--border-strong)] shadow-[var(--shadow-media)]">
      <div className="relative bg-[var(--surface-subtle)]">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          width={1440}
          height={900}
          poster="/media/screenshots/beads-desk-intro.png"
          aria-label={videoLabel}
          aria-describedby="hero-video-caption"
          onPlay={() => setManualPlayback("playing")}
          className="block aspect-[16/10] w-full bg-[var(--surface-subtle)] object-cover"
        >
          <source src="/media/beads-desk-intro.mp4" type="video/mp4" />
        </video>

        <button
          type="button"
          onClick={togglePlayback}
          aria-label={isPaused ? playAriaLabel : pauseAriaLabel}
          className="absolute end-2.5 bottom-2.5 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)]/92 px-3 py-1 text-xs font-semibold text-[var(--ink-primary)] shadow-sm backdrop-blur-sm transition-colors hover:bg-[var(--surface-card)]"
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${isPaused ? "bg-[var(--ink-muted)]" : "bg-emerald-500"}`}
          />
          <span>{isPaused ? playLabel : pauseLabel}</span>
        </button>
      </div>

      <figcaption
        id="hero-video-caption"
        className="border-t border-[var(--border-subtle)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-secondary)]"
      >
        {videoCaption}
      </figcaption>
    </figure>
  );
}
