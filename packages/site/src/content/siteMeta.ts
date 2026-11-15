import type { Metadata } from "next";

import type { SiteLocale } from "./types";

export const SITE_URL = "https://beads-desk.seungyeop-lee.com";
export const REPO_URL = "https://github.com/seungyeop-lee/beads-desk";
export const ISSUES_URL = `${REPO_URL}/issues`;
export const CONTRIBUTING_URL = `${REPO_URL}/blob/main/CONTRIBUTING.md`;
export const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const NPM_URL = "https://www.npmjs.com/package/@seungyeop-lee/beads-desk";
export const HERO_OG_IMAGE_PATH = "/media/screenshots/now.png";

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
  description: string;
  ogLocale: string;
  ogImageAlt: string;
}

const SEO_SPECS: Record<SiteLocale, LocaleSeoSpec> = {
  en: {
    title: "beads-desk | Local Web UI for Beads (bd) Issue Tracker",
    description:
      "Review the plans, decisions, Mermaid diagrams, screenshots, and questions your coding agents leave in Beads (bd), with due dates, bottlenecks, and dependency graphs.",
    ogLocale: "en_US",
    ogImageAlt:
      "beads-desk Now screen showing overdue and upcoming issues, bottlenecks, and epic progress bars",
  },
  ko: {
    title: "beads-desk | Beads (bd) 이슈 트래커용 로컬 웹 UI",
    description:
      "에이전트가 Beads(bd)에 남긴 계획, 결정, Mermaid 다이어그램, 스크린샷, 질문을 브라우저에서 검토하고 편집하는 로컬 웹 UI입니다.",
    ogLocale: "ko_KR",
    ogImageAlt: "마감일 그룹과 병목 이슈, 에픽 진행률을 한눈에 보여 주는 beads-desk 지금 화면",
  },
  ja: {
    title: "beads-desk | Beads (bd) イシュートラッカー向けローカル Web UI",
    description:
      "エージェントが Beads(bd) に残した計画、決定、Mermaid 図、スクリーンショット、質問をブラウザでレビュー・編集できるローカル Web UI です。",
    ogLocale: "ja_JP",
    ogImageAlt: "締め切りグループ、ボトルネック、エピック進捗バーを表示する beads-desk のいま画面",
  },
};

export function localeAbsoluteUrl(locale: SiteLocale): string {
  return `${SITE_URL}${LOCALE_PATHS[locale]}`;
}

export function buildLocaleMetadata(locale: SiteLocale): Metadata {
  const spec = SEO_SPECS[locale];
  const canonicalUrl = localeAbsoluteUrl(locale);
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
      title: spec.title,
      description: spec.description,
      url: canonicalUrl,
      locale: spec.ogLocale,
      alternateLocale: alternateLocales,
      images: [
        {
          url: `${SITE_URL}${HERO_OG_IMAGE_PATH}`,
          width: 2880,
          height: 1440,
          alt: spec.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: spec.title,
      description: spec.description,
      images: [`${SITE_URL}${HERO_OG_IMAGE_PATH}`],
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
    screenshot: `${SITE_URL}${HERO_OG_IMAGE_PATH}`,
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
