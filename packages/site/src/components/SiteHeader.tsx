import { LOCALE_PATHS, NPM_URL, REPO_URL } from "../content/siteMeta";
import type { SiteContent } from "../content/types";
import { LanguageDropdown } from "./LanguageDropdown";

interface SiteHeaderProps {
  content: SiteContent;
}

export function BrandMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-6 shrink-0">
      <g stroke="#1c1917" strokeOpacity="0.45" strokeWidth="1.25">
        <circle cx="7.5" cy="7.5" r="6.5" fill="#bedafe" />
        <circle cx="22.5" cy="7.5" r="6.5" fill="#e6cdf2" />
        <circle cx="7.5" cy="22.5" r="6.5" fill="#a7f3d1" />
        <circle cx="22.5" cy="22.5" r="6.5" fill="#fee1b9" />
      </g>
    </svg>
  );
}

export function SiteHeader({ content }: SiteHeaderProps) {
  return (
    <header className="sticky inset-bs-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--surface-page)]/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2.5 px-4 py-3 sm:px-6">
        <a
          href={LOCALE_PATHS[content.locale]}
          className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-[var(--ink-primary)] no-underline"
        >
          <BrandMark />
          <span>beads-desk</span>
        </a>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <nav aria-label={content.nav.primaryLabel} className="hidden sm:block">
            <ul className="flex items-center gap-4 text-sm font-medium text-[var(--ink-secondary)]">
              <li>
                <a href="#features" className="hover:text-[var(--ink-primary)]">
                  {content.nav.features}
                </a>
              </li>
              <li>
                <a href="#requirements" className="hover:text-[var(--ink-primary)]">
                  {content.nav.requirements}
                </a>
              </li>
              <li>
                <a href="#install" className="hover:text-[var(--ink-primary)]">
                  {content.nav.install}
                </a>
              </li>
              <li>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--ink-primary)]"
                >
                  {content.nav.github}
                </a>
              </li>
              <li>
                <a
                  href={NPM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--ink-primary)]"
                >
                  {content.nav.npm}
                </a>
              </li>
            </ul>
          </nav>

          <LanguageDropdown locale={content.locale} languageLabel={content.nav.languageLabel} />
        </div>
      </div>
    </header>
  );
}
