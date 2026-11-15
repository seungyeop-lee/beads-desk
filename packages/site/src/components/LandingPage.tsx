import {
  CHANGELOG_URL,
  CONTRIBUTING_URL,
  ISSUES_URL,
  LICENSE_URL,
  LOCALE_LABELS,
  REPO_URL,
  buildSoftwareApplicationJsonLd,
} from "../content/siteMeta";
import type { SiteContent, SiteLocale } from "../content/types";
import { CopyCommandBlock } from "./CopyCommandBlock";
import { HeroVideoCard } from "./HeroVideoCard";
import { LocaleLink } from "./LocaleLink";
import { ScreenshotCard } from "./ScreenshotCard";
import { BrandMark, SiteHeader } from "./SiteHeader";

interface LandingPageProps {
  content: SiteContent;
}

const LOCALES: readonly SiteLocale[] = ["en", "ko", "ja"];

export function LandingPage({ content }: LandingPageProps) {
  const jsonLd = buildSoftwareApplicationJsonLd(content.locale);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {content.skipToContent}
      </a>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <SiteHeader content={content} />

      <main id="main-content" tabIndex={-1}>
        {/* Hero */}
        <section className="hero-backdrop">
          <div className="mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14 sm:pb-16">
            <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="min-w-0 lg:col-span-5">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold text-[var(--ink-secondary)]">
                  <span className="tone-dot tone-mint" aria-hidden="true" />
                  <span>{content.hero.eyebrow}</span>
                </p>

                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ink-primary)] sm:text-5xl sm:leading-[1.12]">
                  {content.hero.headline}
                </h1>

                <p className="mt-4 text-base leading-relaxed text-[var(--ink-secondary)] sm:text-lg">
                  {content.hero.subtitle}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="#install"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent-ink)] px-5 text-sm font-semibold text-[var(--accent-ink-contrast)] transition-opacity hover:opacity-90"
                  >
                    {content.hero.primaryCta}
                  </a>
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-5 text-sm font-semibold text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface-subtle)]"
                  >
                    {content.hero.secondaryCta}
                  </a>
                </div>
              </div>

              <div className="min-w-0 lg:col-span-7">
                <HeroVideoCard
                  videoLabel={content.hero.videoLabel}
                  videoCaption={content.hero.videoCaption}
                  pauseLabel={content.hero.videoPauseLabel}
                  playLabel={content.hero.videoPlayLabel}
                  pauseAriaLabel={content.hero.videoPauseAriaLabel}
                  playAriaLabel={content.hero.videoPlayAriaLabel}
                />
              </div>
            </div>

            <div className="terminal-strip mt-10 p-4 sm:mt-12 sm:p-5">
              <p className="mb-3 text-xs font-semibold tracking-wide text-[var(--terminal-muted)] uppercase">
                {content.hero.quickStartTitle}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <CopyCommandBlock
                  variant="terminal"
                  label={content.hero.installLabel}
                  code="npm install -g @seungyeop-lee/beads-desk"
                  buttonPrefix={content.copy.buttonPrefix}
                  copiedLabel={content.copy.copied}
                  failedLabel={content.copy.failed}
                />
                <CopyCommandBlock
                  variant="terminal"
                  label={content.hero.startLabel}
                  code="bd-desk start --open"
                  buttonPrefix={content.copy.buttonPrefix}
                  copiedLabel={content.copy.copied}
                  failedLabel={content.copy.failed}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section
          id="features"
          className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)]/45 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-bold tracking-wider text-[var(--ink-muted)] uppercase">
                {content.featuresSection.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-3xl">
                {content.featuresSection.title}
              </h2>
              <p className="mt-3 text-base text-[var(--ink-secondary)]">
                {content.featuresSection.subtitle}
              </p>
            </div>

            <div className="mt-12 space-y-16 sm:space-y-20">
              {content.featuresSection.items.map((item, index) => {
                const reversed = index % 2 === 1;
                return (
                  <article
                    key={item.id}
                    id={item.id}
                    className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10"
                  >
                    <div className={`min-w-0 lg:col-span-5 ${reversed ? "lg:order-2" : ""}`}>
                      <span className={`tone-pill tone-${item.tone}`}>
                        <span className="tone-dot" aria-hidden="true" />
                        <span>{item.badge}</span>
                      </span>
                      <h3 className="mt-3 text-xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-2xl">
                        {item.title}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink-secondary)] sm:text-base">
                        {item.summary}
                      </p>
                      <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[var(--ink-secondary)]">
                        {item.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2.5">
                            <span
                              aria-hidden="true"
                              className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-[var(--ink-muted)]"
                            />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div
                      className={`min-w-0 space-y-4 lg:col-span-7 ${reversed ? "lg:order-1" : ""}`}
                    >
                      {item.screenshots.map((shot) => (
                        <ScreenshotCard
                          key={shot.src}
                          src={shot.src}
                          alt={shot.alt}
                          width={shot.width}
                          height={shot.height}
                          caption={shot.caption}
                          enlargeLabel={content.featuresSection.enlargeLabel}
                          closeDialogLabel={content.featuresSection.closeDialogLabel}
                        />
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-16 border-t border-[var(--border-subtle)] pt-12">
              <h3 className="text-lg font-bold text-[var(--ink-primary)]">
                {content.featuresSection.alsoTitle}
              </h3>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {content.featuresSection.alsoItems.map((extra) => (
                  <li key={extra.name} className="site-card p-5">
                    <h4 className="text-sm font-bold text-[var(--ink-primary)]">{extra.name}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
                      {extra.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section
          id="requirements"
          className="border-t border-[var(--border-subtle)] py-16 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-wider text-[var(--ink-muted)] uppercase">
                {content.requirementsSection.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-3xl">
                {content.requirementsSection.title}
              </h2>
            </div>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {content.requirementsSection.items.map((req) => (
                <div key={req.label} className="site-card p-5">
                  <dt className="text-sm font-bold text-[var(--ink-primary)]">{req.label}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
                    {req.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Getting Started */}
        <section
          id="install"
          className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)]/45 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-wider text-[var(--ink-muted)] uppercase">
                {content.installSection.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink-primary)] sm:text-3xl">
                {content.installSection.title}
              </h2>
              <p className="mt-3 text-base text-[var(--ink-secondary)]">
                {content.installSection.subtitle}
              </p>
            </div>

            <ol className="mt-10 grid gap-6 lg:grid-cols-2">
              {content.installSection.steps.map((step) => (
                <li
                  key={step.step}
                  className="site-card flex min-w-0 flex-col justify-between gap-5 p-6"
                >
                  <div>
                    <span className="tone-pill tone-peach">
                      <span className="tone-dot" aria-hidden="true" />
                      <span>{step.step}</span>
                    </span>
                    <h3 className="mt-3 text-lg font-bold text-[var(--ink-primary)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--ink-secondary)]">
                      {step.description}
                    </p>
                  </div>

                  {step.commands && (
                    <div className="space-y-2.5">
                      {step.commands.map((cmd) => (
                        <CopyCommandBlock
                          key={cmd.id}
                          label={cmd.label}
                          code={cmd.code}
                          buttonPrefix={content.copy.buttonPrefix}
                          copiedLabel={content.copy.copied}
                          failedLabel={content.copy.failed}
                        />
                      ))}
                      {step.note && (
                        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
                          {step.note}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-10 site-card p-6">
              <h3 className="text-base font-bold text-[var(--ink-primary)]">
                {content.installSection.lifecycleTitle}
              </h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                {content.installSection.lifecycleItems.map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <dt className="flex flex-wrap items-center gap-2 text-sm font-bold text-[var(--ink-primary)]">
                      <span>{item.label}</span>
                      {item.command && (
                        <code className="rounded bg-[var(--surface-subtle)] px-2 py-0.5 text-xs font-medium">
                          {item.command}
                        </code>
                      )}
                    </dt>
                    <dd className="text-sm leading-relaxed text-[var(--ink-secondary)]">
                      {item.detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-page)] py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 text-base font-bold text-[var(--ink-primary)]">
              <BrandMark />
              <span>beads-desk</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-secondary)]">
              {content.footer.tagline}
            </p>
            <p className="mt-4 text-xs text-[var(--ink-muted)]">
              {content.footer.acknowledgementsPrefix}
              <a
                href="https://github.com/mantoni/beads-ui"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--ink-primary)]"
              >
                {content.footer.acknowledgementsLinkText}
              </a>
              {content.footer.acknowledgementsSuffix}
            </p>
          </div>

          <div className="md:col-span-4">
            <h2 className="text-sm font-bold text-[var(--ink-primary)]">
              {content.footer.contributingTitle}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink-secondary)]">
              {content.footer.contributingText}
            </p>
            <p className="mt-3">
              <a
                href={CONTRIBUTING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[var(--ink-primary)] underline decoration-[var(--border-strong)] underline-offset-4 hover:opacity-80"
              >
                {content.footer.contributingLinkText}
              </a>
            </p>
          </div>

          <div className="md:col-span-3">
            <h2 className="text-sm font-bold text-[var(--ink-primary)]">
              {content.footer.linksTitle}
            </h2>
            <ul className="mt-2.5 space-y-2 text-sm text-[var(--ink-secondary)]">
              <li>
                <a
                  href={content.footer.usageGuideHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--ink-primary)]"
                >
                  {content.footer.usageGuideLabel}
                </a>
              </li>
              <li>
                <a
                  href={ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--ink-primary)]"
                >
                  {content.footer.issuesLabel}
                </a>
              </li>
              <li>
                <a
                  href={CHANGELOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--ink-primary)]"
                >
                  {content.footer.changelogLabel}
                </a>
              </li>
              <li>
                <a
                  href={LICENSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--ink-primary)]"
                >
                  {content.footer.licenseLabel}
                </a>
              </li>
            </ul>

            <ul className="mt-5 flex flex-wrap gap-2">
              {LOCALES.map((loc) => (
                <li key={loc}>
                  <LocaleLink locale={loc} currentLocale={content.locale} className="nav-lang-link">
                    {LOCALE_LABELS[loc]}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
