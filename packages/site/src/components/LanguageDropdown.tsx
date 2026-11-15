"use client";

import { useEffect, useRef } from "react";

import { LOCALE_LABELS } from "../content/siteMeta";
import type { SiteLocale } from "../content/types";
import { LocaleLink } from "./LocaleLink";

interface LanguageDropdownProps {
  locale: SiteLocale;
  languageLabel: string;
}

const LOCALES: readonly SiteLocale[] = ["en", "ko", "ja"];

export function LanguageDropdown({ locale, languageLabel }: LanguageDropdownProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      const details = detailsRef.current;
      if (!details?.open || event.key !== "Escape") return;
      details.open = false;
      summaryRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <nav aria-label={languageLabel}>
      <details ref={detailsRef} className="lang-dropdown relative">
        <summary
          ref={summaryRef}
          className="lang-dropdown-summary inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface-subtle)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="size-3.5 shrink-0 text-[var(--ink-secondary)]"
          >
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
            <ellipse cx="10" cy="10" rx="3.4" ry="7.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2.8 10h14.4" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <span lang={locale}>{LOCALE_LABELS[locale]}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="lang-dropdown-chevron size-3.5 shrink-0 text-[var(--ink-muted)]"
          >
            <path
              d="M6 8l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>

        <ul className="lang-dropdown-menu absolute end-0 z-50 mt-1.5 min-w-36 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] p-1 shadow-[var(--shadow-media)]">
          {LOCALES.map((loc) => {
            const isCurrent = loc === locale;
            return (
              <li key={loc}>
                <LocaleLink
                  locale={loc}
                  currentLocale={locale}
                  onSelect={() => {
                    if (detailsRef.current) detailsRef.current.open = false;
                  }}
                  className="lang-dropdown-item flex min-h-9 items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs text-[var(--ink-secondary)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--ink-primary)]"
                >
                  <span>{LOCALE_LABELS[loc]}</span>
                  {isCurrent && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="size-3.5 shrink-0 text-[var(--ink-primary)]"
                    >
                      <path
                        d="M4.5 10.5 8.25 14.25 15.5 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </LocaleLink>
              </li>
            );
          })}
        </ul>
      </details>
    </nav>
  );
}
