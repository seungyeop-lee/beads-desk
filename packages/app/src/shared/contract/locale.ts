export const LOCALES = ["ko", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** 사용자가 헤더에서 고른 언어를 담는 쿠키입니다. 없으면 서버가 브라우저 언어로 정합니다. */
export const LOCALE_COOKIE = "beads-desk-locale";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
