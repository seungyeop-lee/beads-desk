/** 탭이 많아지면 제목이 뒷부분부터 잘리므로, 판단 기다림 개수를 제목 맨 앞에 괄호로 붙입니다. 0건이면 제목을 그대로 둡니다. */
export function titleWithHumanDecisionCount(title: string, count: number): string {
  return count > 0 ? `(${count}) ${title}` : title;
}
