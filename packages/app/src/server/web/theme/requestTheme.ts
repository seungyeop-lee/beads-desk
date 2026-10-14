import { cookies } from "next/headers";
import { isThemeChoice, THEME_COOKIE, type ThemeChoice } from "@/shared/contract/theme";

/** layout이 첫 HTML부터 고른 테마로 그리도록 요청의 쿠키에서 테마를 읽습니다. */
export async function requestTheme(): Promise<ThemeChoice> {
  const chosen = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemeChoice(chosen) ? chosen : "system";
}
