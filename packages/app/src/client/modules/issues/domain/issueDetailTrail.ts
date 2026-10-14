/** 상세 dialog가 보여 주는 이슈입니다. side는 옆 패널에 읽기 전용으로 연 이슈이고, 없으면 null입니다. */
export type IssueDetailLocation = { issue: string; side: string | null };

/**
 * 상세 dialog에서 거쳐 온 주 상세의 기록을 갱신합니다. 마지막 항목이 지금 보이는 상세이고, 그 앞 항목이 돌아갈 곳입니다.
 * 바로 앞 항목의 이슈로 옮기면 돌아간 것으로 보고 마지막 항목을 지웁니다.
 * 옆 패널만 바뀌면 마지막 항목만 고쳐, 나중에 돌아왔을 때 떠날 때의 옆 패널이 다시 열리게 합니다.
 * dialog가 닫히면(location이 null) 기록을 비웁니다.
 */
export function nextIssueDetailTrail(
  trail: IssueDetailLocation[],
  location: IssueDetailLocation | null,
): IssueDetailLocation[] {
  if (!location) return [];
  if (trail.at(-1)?.issue === location.issue) return [...trail.slice(0, -1), location];
  if (trail.at(-2)?.issue === location.issue) return [...trail.slice(0, -2), location];
  return [...trail, location];
}
