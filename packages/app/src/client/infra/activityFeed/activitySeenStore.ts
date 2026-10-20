// 마지막으로 본 시각은 서버가 쓰지 않는 값이라 cookie 대신 localStorage에 둡니다. 서버를 다시 시작해도 남고,
// 판단 기다림 알림의 켠 표시처럼 origin마다 따로라서 다른 포트로 서버가 뜨면 처음 연 것으로 봅니다.
const SEEN_KEY_PREFIX = "beads-desk.activity-seen.";

/** 이 브라우저에서 workspace의 활동 화면을 마지막으로 연 시각(epoch ms)입니다. 연 적이 없거나 읽을 수 없으면 null입니다. */
export function loadActivitySeenAt(workspace: string): number | null {
  try {
    const stored = Number(localStorage.getItem(SEEN_KEY_PREFIX + workspace) ?? NaN);
    return Number.isFinite(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function saveActivitySeenAt(workspace: string, at: number) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + workspace, String(at));
  } catch {
    // 저장소를 쓸 수 없으면 다음에 열 때도 구분선을 그리지 않습니다.
  }
}
