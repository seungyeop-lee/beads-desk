import type { ThemeChoice } from "@/shared/contract/theme";

/**
 * `<html data-theme>`에 넣을 daisyUI 테마 이름입니다. 이름은 designSystem/styles/theme.css의 테마와 같아야 합니다.
 * `system`이면 속성을 두지 않아, theme.css의 `prefersdark`가 운영체제 설정에 따라 테마를 고르게 합니다.
 */
export function themeAttribute(theme: ThemeChoice): string | undefined {
  if (theme === "light") return "desk";
  if (theme === "dark") return "desk-dark";
  return undefined;
}
