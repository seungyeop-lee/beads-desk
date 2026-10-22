/** 사용자가 화면을 움직이기 전까지, 늦게 도착하는 본문으로 패널 크기가 바뀌어도 같은 위치를 유지합니다. */
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

export function keepIssuePanelInView(observed: HTMLElement, scroll: () => void) {
  const observer = new ResizeObserver(scroll);
  const stop = () => {
    observer.disconnect();
    for (const type of USER_SCROLL_EVENTS)
      window.removeEventListener(type, stop, { capture: true });
  };
  observer.observe(observed);
  for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { capture: true });
  return stop;
}
