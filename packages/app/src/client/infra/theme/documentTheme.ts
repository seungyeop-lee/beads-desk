import { THEME_COOKIE, type ThemeChoice } from "@/shared/contract/theme";

/** 고른 테마를 1년 동안 기억합니다. 서버는 다음 요청부터 이 값으로 `<html>`의 테마를 정합니다. */
export function saveTheme(theme: ThemeChoice) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}
