/** 상단 탭의 순서입니다. screen은 화면 이름을 담은 사전 항목이고, tone은 그 탭과 화면 제목에 함께 쓰는 색입니다. */
export const SCREEN_TABS = [
  { href: "/focus", screen: "focus", tone: "tone-peach" },
  { href: "/issues", screen: "issues", tone: "tone-azure" },
  { href: "/epics", screen: "epics", tone: "tone-lilac" },
  { href: "/board", screen: "board", tone: "tone-mint" },
  { href: "/decisions", screen: "decisions", tone: "tone-sand" },
] as const;

export type ScreenHref = (typeof SCREEN_TABS)[number]["href"];

export function screenTone(href: ScreenHref): string {
  return SCREEN_TABS.find((tab) => tab.href === href)!.tone;
}
