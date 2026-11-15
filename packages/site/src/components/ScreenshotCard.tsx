"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface ScreenshotCardProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
  enlargeLabel: string;
  closeDialogLabel: string;
}

export function ScreenshotCard({
  src,
  alt,
  width,
  height,
  caption,
  enlargeLabel,
  closeDialogLabel,
}: ScreenshotCardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  function openPreview() {
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function closePreview() {
    dialogRef.current?.close();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function handleBackdropClick(event: MouseEvent) {
      if (event.target === dialog) {
        dialogRef.current?.close();
      }
    }

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, []);

  return (
    <figure className="site-card overflow-hidden">
      <div className="relative bg-[var(--surface-subtle)]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          unoptimized
          loading="lazy"
          className="block h-auto w-full object-cover"
        />
        <button
          type="button"
          onClick={openPreview}
          aria-label={`${enlargeLabel}: ${caption}`}
          className="absolute inset-be-2.5 inset-ie-2.5 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface-card)]/92 px-3 py-1 text-xs font-semibold text-[var(--ink-primary)] shadow-sm backdrop-blur-xs transition-colors hover:bg-[var(--surface-card)]"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-3.5">
            <path
              d="M12.5 3.5h4v4M7.5 16.5h-4v-4M16.5 3.5l-5 5M3.5 16.5l5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{enlargeLabel}</span>
        </button>
      </div>
      <figcaption className="border-t border-[var(--border-subtle)] px-4 py-2.5 text-xs text-[var(--ink-secondary)]">
        {caption}
      </figcaption>

      <dialog
        ref={dialogRef}
        aria-label={caption}
        className="screenshot-dialog"
        {...({ closedby: "any" } as Record<string, string>)}
        onClose={() => setIsOpen(false)}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--ink-primary)]">{caption}</p>
          <button
            type="button"
            onClick={closePreview}
            aria-label={closeDialogLabel}
            className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-page)] px-2.5 text-xs font-semibold text-[var(--ink-primary)] hover:border-[var(--border-strong)]"
          >
            {closeDialogLabel}
          </button>
        </div>
        <div className="max-h-[calc(92dvh-4rem)] overflow-auto bg-[var(--surface-subtle)] p-2 sm:p-4">
          {isOpen && (
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              unoptimized
              className="mx-auto block h-auto max-w-full rounded-md"
            />
          )}
        </div>
      </dialog>
    </figure>
  );
}
