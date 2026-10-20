/**
 * 상단 탭을 묶음별로 나눈 순서입니다. 헤더는 묶음 사이에 구분선을 그립니다.
 * screen은 화면 이름을 담은 사전 항목이고, tone은 그 탭과 화면 제목에 함께 쓰는 색입니다.
 */
export const SCREEN_TAB_GROUPS = [
  // 들어오자마자 확인할 일과 자리를 비운 사이 생긴 일
  [
    { href: "/focus", screen: "focus", tone: "tone-peach" },
    { href: "/human", screen: "humanDecisions", tone: "tone-lavender" },
    { href: "/activity", screen: "activityFeed", tone: "tone-sky" },
  ],
  // 이슈를 찾아보고 고치는 화면
  [
    { href: "/issues", screen: "issues", tone: "tone-azure" },
    { href: "/epics", screen: "epics", tone: "tone-lilac" },
    { href: "/board", screen: "board", tone: "tone-mint" },
  ],
  // 기록을 찾아보거나 가끔 관리하는 화면
  [
    { href: "/decisions", screen: "decisions", tone: "tone-sand" },
    { href: "/hygiene", screen: "hygiene", tone: "tone-sage" },
  ],
] as const;

export const SCREEN_TABS = SCREEN_TAB_GROUPS.flat();

export type ScreenHref = (typeof SCREEN_TABS)[number]["href"];

export function screenTone(href: ScreenHref): string {
  return SCREEN_TABS.find((tab) => tab.href === href)!.tone;
}
