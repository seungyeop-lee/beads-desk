import type { Metadata } from "next";

import type { SiteLocale } from "./types";

export const SITE_URL = "https://beads-desk.seungyeop-lee.com";
export const REPO_URL = "https://github.com/seungyeop-lee/beads-desk";
export const ISSUES_URL = `${REPO_URL}/issues`;
export const CONTRIBUTING_URL = `${REPO_URL}/blob/main/CONTRIBUTING.md`;
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const NPM_URL = "https://www.npmjs.com/package/@seungyeop-lee/beads-desk";
export const HERO_SCREENSHOT_PATH = "/media/screenshots/now.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const LOCALE_PATHS: Record<SiteLocale, string> = {
  en: "/",
  ko: "/ko/",
  ja: "/ja/",
};

export const LOCALE_LABELS: Record<SiteLocale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
};

interface LocaleSeoSpec {
  title: string;
  ogTitle: string;
  description: string;
  ogLocale: string;
  ogImagePath: string;
  ogImageAlt: string;
}

const SEO_SPECS: Record<SiteLocale, LocaleSeoSpec> = {
  en: {
    title: "beads-desk | Local Web UI for Beads (bd) Issue Tracker",
    ogTitle: "beads-desk · Review Agent Work in Beads",
    description:
      "Keep your terminal bd workflow and inspect coding agent plans, Mermaid diagrams, bottlenecks, diffs, and human gates locally in your browser.",
    ogLocale: "en_US",
    ogImagePath: "/og/en.png",
    ogImageAlt:
      "beads-desk overview showing stage-by-stage dependency graph, epic progress bars, and Needs human approval gate",
  },
  ko: {
    title: "beads-desk | Beads (bd) 이슈 트래커 로컬 웹 UI",
    ogTitle: "beads-desk · 에이전트 작업, 브라우저로 검토",
    description:
      "터미널 bd 흐름은 그대로 두고, 코딩 에이전트가 남긴 계획·결정·Mermaid·스크린샷·질문을 브라우저에서 한눈에 검토하세요.",
    ogLocale: "ko_KR",
    ogImagePath: "/og/ko.png",
    ogImageAlt:
      "beads-desk의 단계별 의존 그래프, 에픽 진행률, 판단 기다림 human gate 화면 미리보기",
  },
  ja: {
    title: "beads-desk | Beads (bd) イシュートラッカー向けローカル Web UI",
    ogTitle: "beads-desk · エージェント作業をブラウザで一望",
    description:
      "ターミナルの bd フローはそのままに、エージェントが残した計画・決定・Mermaid 図・diff・確認依頼をブラウザでまとめて確認できます。",
    ogLocale: "ja_JP",
    ogImagePath: "/og/ja.png",
    ogImageAlt:
      "beads-desk の段階別依存グラフ、エピック進捗バー、判断待ち human gate 画面のプレビュー",
  },
};

export function localeAbsoluteUrl(locale: SiteLocale): string {
  return `${SITE_URL}${LOCALE_PATHS[locale]}`;
}

export function localeOgImageUrl(locale: SiteLocale): string {
  return `${SITE_URL}${SEO_SPECS[locale].ogImagePath}`;
}

export function buildLocaleMetadata(locale: SiteLocale): Metadata {
  const spec = SEO_SPECS[locale];
  const canonicalUrl = localeAbsoluteUrl(locale);
  const ogImageUrl = localeOgImageUrl(locale);
  const alternateLocales = (Object.keys(SEO_SPECS) as SiteLocale[])
    .filter((candidate) => candidate !== locale)
    .map((candidate) => SEO_SPECS[candidate].ogLocale);

  return {
    metadataBase: new URL(SITE_URL),
    title: spec.title,
    description: spec.description,
    applicationName: "beads-desk",
    keywords: [
      "beads-desk",
      "Beads",
      "bd",
      "issue tracker",
      "coding agents",
      "local-first",
      "dependency graph",
      "Mermaid",
    ],
    authors: [{ name: "seungyeop-lee", url: "https://github.com/seungyeop-lee" }],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: localeAbsoluteUrl("en"),
        ko: localeAbsoluteUrl("ko"),
        ja: localeAbsoluteUrl("ja"),
        "x-default": localeAbsoluteUrl("en"),
      },
    },
    openGraph: {
      type: "website",
      siteName: "beads-desk",
      title: spec.ogTitle,
      description: spec.description,
      url: canonicalUrl,
      locale: spec.ogLocale,
      alternateLocale: alternateLocales,
      images: [
        {
          url: ogImageUrl,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          type: "image/png",
          alt: spec.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: spec.ogTitle,
      description: spec.description,
      images: [
        {
          url: ogImageUrl,
          alt: spec.ogImageAlt,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildSoftwareApplicationJsonLd(locale: SiteLocale) {
  const spec = SEO_SPECS[locale];
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "beads-desk",
    description: spec.description,
    url: localeAbsoluteUrl(locale),
    inLanguage: locale,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux, Windows",
    license: LICENSE_URL,
    codeRepository: REPO_URL,
    image: localeOgImageUrl(locale),
    screenshot: `${SITE_URL}${HERO_SCREENSHOT_PATH}`,
    author: {
      "@type": "Person",
      name: "seungyeop-lee",
      url: "https://github.com/seungyeop-lee",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}
