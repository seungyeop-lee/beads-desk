/** bd가 닫기를 거부했을 때 강제로 닫을지 묻습니다. */
export function confirmForceClose(reason: string): boolean {
  return window.confirm(
    `열린 하위 이슈나 닫히지 않은 선행 이슈가 있어 bd가 닫기를 거부했습니다.\n\n${reason}\n\n그래도 닫을까요?`,
  );
}
