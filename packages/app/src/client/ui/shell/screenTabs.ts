/** 상단 탭의 순서입니다. tone은 그 탭과 화면 제목에 함께 쓰는 색입니다. */
export const SCREEN_TABS = [
  { href: "/issues", label: "이슈", tone: "tone-azure" },
  { href: "/epics", label: "에픽", tone: "tone-lilac" },
  { href: "/board", label: "보드", tone: "tone-mint" },
  { href: "/decisions", label: "결정", tone: "tone-sand" },
] as const;

export type ScreenHref = (typeof SCREEN_TABS)[number]["href"];

export function screenTone(href: ScreenHref): string {
  return SCREEN_TABS.find((tab) => tab.href === href)!.tone;
}
