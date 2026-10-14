export const THEME_CHOICES = ["system", "light", "dark"] as const;

/** `system`은 운영체제의 밝은·어두운 모드를 따르고, 나머지는 운영체제 설정과 관계없이 그 테마로 고정합니다. */
export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** 사용자가 설정에서 고른 테마를 담는 쿠키입니다. 없으면 `system`으로 봅니다. */
export const THEME_COOKIE = "beads-desk-theme";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return THEME_CHOICES.includes(value as ThemeChoice);
}
