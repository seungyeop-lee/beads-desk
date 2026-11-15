import type { SiteLocale } from "../content/types";

export const SITE_LOCALE_STORAGE_KEY = "beads-desk.site-locale";

/**
 * 루트(`/`) 진입 시 인라인 스크립트에서도 `.toString()`으로 직렬화해 실행하므로
 * 외부 변수나 다른 함수 호출 없이 리터럴과 매개변수만으로 언어를 판별합니다.
 */
export function resolvePreferredSiteLocale(
  savedLocale: string | null | undefined,
  browserLanguages: readonly string[],
): SiteLocale {
  if (savedLocale === "ko" || savedLocale === "ja" || savedLocale === "en") {
    return savedLocale;
  }

  for (let i = 0; i < browserLanguages.length; i += 1) {
    const tag = browserLanguages[i];
    if (typeof tag !== "string") continue;
    const base = tag.trim().split("-")[0].toLowerCase();
    if (base === "ko" || base === "ja" || base === "en") {
      return base;
    }
  }

  return "en";
}

/** 루트(`/`) HTML `<head>`에서 첫 페인트 전에 동기 실행할 언어 리다이렉트 스크립트를 생성합니다. */
export function buildRootLocaleRedirectScript(): string {
  const storageKey = JSON.stringify(SITE_LOCALE_STORAGE_KEY);
  return `(function(){try{var p=window.location.pathname;if(p!=="/"&&p!=="/index.html")return;var s=null;try{s=window.localStorage.getItem(${storageKey})}catch(e){}var l=navigator.languages&&navigator.languages.length>0?navigator.languages:navigator.language?[navigator.language]:[];var t=(${resolvePreferredSiteLocale.toString()})(s,l);if(t==="ko"||t==="ja"){window.location.replace("/"+t+"/"+window.location.search+window.location.hash)}}catch(e){}})()`;
}

export function saveSiteLocalePreference(locale: SiteLocale): void {
  try {
    window.localStorage.setItem(SITE_LOCALE_STORAGE_KEY, locale);
  } catch {
    // 스토리지가 차단된 환경에서는 예외를 삼키고 정적 링크 이동만 이어갑니다.
  }
}
