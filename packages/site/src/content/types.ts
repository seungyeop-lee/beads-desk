export type SiteLocale = "en" | "ko" | "ja";

export interface FeatureShowcaseItem {
  id: string;
  badge: string;
  tone: "azure" | "sand" | "mint" | "lavender" | "lilac" | "coral" | "sky" | "sage" | "peach";
  title: string;
  summary: string;
  bullets: readonly string[];
  screenshots: readonly {
    src: string;
    alt: string;
    width: number;
    height: number;
    caption: string;
  }[];
}

export interface SiteContent {
  locale: SiteLocale;
  localeLabel: string;
  skipToContent: string;
  nav: {
    primaryLabel: string;
    languageLabel: string;
    features: string;
    install: string;
    requirements: string;
    github: string;
    npm: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    quickStartTitle: string;
    installLabel: string;
    startLabel: string;
    videoCaption: string;
    videoLabel: string;
    videoPauseLabel: string;
    videoPlayLabel: string;
    videoPauseAriaLabel: string;
    videoPlayAriaLabel: string;
  };
  copy: {
    buttonPrefix: string;
    copied: string;
    failed: string;
  };
  featuresSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    enlargeLabel: string;
    closeDialogLabel: string;
    items: readonly FeatureShowcaseItem[];
    alsoTitle: string;
    alsoItems: readonly {
      name: string;
      description: string;
    }[];
  };
  requirementsSection: {
    eyebrow: string;
    title: string;
    items: readonly {
      label: string;
      detail: string;
    }[];
  };
  installSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: readonly {
      step: string;
      title: string;
      description: string;
      commands?: readonly {
        id: string;
        label: string;
        code: string;
      }[];
      note?: string;
    }[];
    lifecycleTitle: string;
    lifecycleItems: readonly {
      label: string;
      command?: string;
      detail: string;
    }[];
  };
  footer: {
    tagline: string;
    contributingTitle: string;
    contributingText: string;
    contributingLinkText: string;
    linksTitle: string;
    usageGuideLabel: string;
    usageGuideHref: string;
    changelogLabel: string;
    issuesLabel: string;
    licenseLabel: string;
    acknowledgementsPrefix: string;
    acknowledgementsLinkText: string;
    acknowledgementsSuffix: string;
  };
}
