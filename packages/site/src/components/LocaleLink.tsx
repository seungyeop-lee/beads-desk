"use client";

import type { ReactNode } from "react";

import { LOCALE_PATHS } from "../content/siteMeta";
import type { SiteLocale } from "../content/types";
import { saveSiteLocalePreference } from "../locale/localePreference";

interface LocaleLinkProps {
  locale: SiteLocale;
  currentLocale: SiteLocale;
  className?: string;
  onSelect?: () => void;
  children: ReactNode;
}

export function LocaleLink({
  locale,
  currentLocale,
  className,
  onSelect,
  children,
}: LocaleLinkProps) {
  return (
    <a
      href={LOCALE_PATHS[locale]}
      lang={locale}
      hrefLang={locale}
      aria-current={locale === currentLocale ? "page" : undefined}
      onClick={() => {
        saveSiteLocalePreference(locale);
        onSelect?.();
      }}
      className={className}
    >
      {children}
    </a>
  );
}
