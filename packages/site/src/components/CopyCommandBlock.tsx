"use client";

import { useEffect, useId, useRef, useState } from "react";

interface CopyCommandBlockProps {
  label: string;
  code: string;
  buttonPrefix: string;
  copiedLabel: string;
  failedLabel: string;
  variant?: "default" | "terminal";
}

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
  document.body.append(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

export function CopyCommandBlock({
  label,
  code,
  buttonPrefix,
  copiedLabel,
  failedLabel,
  variant = "default",
}: CopyCommandBlockProps) {
  const codeId = useId();
  const labelId = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncementRef = useRef("");
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    let succeeded: boolean;
    try {
      await navigator.clipboard.writeText(code);
      succeeded = true;
    } catch {
      succeeded = fallbackCopy(code);
    }

    const baseMessage = succeeded ? copiedLabel : failedLabel;
    // VoiceOver는 동일 문구가 반복되면 다시 읽지 않으므로 공백이 아닌 NBSP를 덧붙여 새 알림으로 인식하게 합니다.
    const nextMessage =
      baseMessage === lastAnnouncementRef.current ? `${baseMessage}\u00A0` : baseMessage;
    lastAnnouncementRef.current = nextMessage;

    setStatus(succeeded ? "copied" : "failed");
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(nextMessage));

    timerRef.current = setTimeout(() => {
      setStatus("idle");
      setAnnouncement("");
    }, 2000);
  }

  const isTerminal = variant === "terminal";

  return (
    <div
      className={
        isTerminal
          ? "terminal-card relative flex min-w-0 items-center justify-between gap-3 px-3.5 py-2.5"
          : "site-card relative flex min-w-0 items-center justify-between gap-3 px-3.5 py-2.5"
      }
    >
      <section aria-labelledby={labelId} className="min-w-0 flex-1">
        <div
          id={labelId}
          className={
            isTerminal
              ? "mb-0.5 text-[0.6875rem] font-semibold tracking-wide text-[var(--terminal-muted)] uppercase"
              : "mb-0.5 text-[0.6875rem] font-semibold tracking-wide text-[var(--ink-muted)] uppercase"
          }
        >
          {label}
        </div>
        <pre
          className={
            isTerminal
              ? "overflow-x-auto text-[0.8125rem] leading-snug text-[var(--terminal-ink)] sm:text-sm"
              : "overflow-x-auto text-[0.8125rem] leading-snug text-[var(--ink-primary)] sm:text-sm"
          }
        >
          {isTerminal && (
            <span aria-hidden="true" className="mr-2 select-none text-[var(--terminal-prompt)]">
              $
            </span>
          )}
          <code id={codeId}>{code}</code>
        </pre>
      </section>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`${buttonPrefix} ${code}`}
          data-copied={status === "copied" ? "" : undefined}
          data-failed={status === "failed" ? "" : undefined}
          className={
            isTerminal
              ? "copy-button terminal-copy-button inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-2.5 transition-colors"
              : "copy-button inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-page)] px-2.5 text-[var(--ink-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
          }
        >
          {status === "copied" ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="size-4 text-emerald-600 dark:text-emerald-400"
            >
              <path
                d="M4.5 10.5 8.25 14.25 15.5 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
              <rect
                x="7"
                y="7"
                width="9.5"
                height="9.5"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M13 7V5a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 0 4 5v6.5A1.5 1.5 0 0 0 5.5 13H7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
        <output className="copy-tip">{announcement}</output>
      </div>
    </div>
  );
}
