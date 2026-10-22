import { saveChoiceCookie } from "@/client/infra/cookies/saveChoiceCookie";
import { MESSAGES, type Messages } from "@/client/modules/locale/domain/messages";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/shared/contract/locale";

/**
 * 서버가 layout의 `<html lang>`에 적은 언어의 사전입니다.
 * 화면을 그릴 때는 서버 렌더링과 같은 언어를 써야 하므로 `useMessages`를 쓰고, 이 함수는 이벤트 처리처럼 browser에서만 도는 코드에서 부릅니다.
 */
export function documentMessages(): Messages {
  const lang = document.documentElement.lang;
  return MESSAGES[isLocale(lang) ? lang : "en"];
}

/** 고른 언어를 1년 동안 기억합니다. 서버는 다음 요청부터 브라우저 언어 대신 이 값을 씁니다. */
export function saveLocale(locale: Locale) {
  saveChoiceCookie(LOCALE_COOKIE, locale);
}
