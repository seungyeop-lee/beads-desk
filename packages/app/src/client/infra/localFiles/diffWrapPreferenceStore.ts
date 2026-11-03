// diff 화면의 줄바꿈 선택은 서버가 처음 그리는 화면에 필요 없어 cookie 대신 localStorage에 둡니다.
const WRAP_KEY = "beads-desk.diff-wrap";

const listeners = new Set<() => void>();

/** diff 화면에서 긴 줄을 줄바꿈해 보일지입니다. 고르지 않았으면 줄바꿈이라서, 해제한 표시만 남깁니다. */
export function loadDiffWrapPreference(): boolean {
  try {
    return localStorage.getItem(WRAP_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveDiffWrapPreference(on: boolean) {
  try {
    if (on) localStorage.removeItem(WRAP_KEY);
    else localStorage.setItem(WRAP_KEY, "off");
  } catch {
    // 저장소를 쓸 수 없으면 해제한 표시를 남기지 못해, 다음에 diff 화면을 열 때 다시 줄바꿈으로 보입니다.
  }
  for (const listener of listeners) listener();
}

/** 이 탭이나 다른 탭에서 줄바꿈 선택을 바꾸면 listener를 호출합니다. */
export function subscribeDiffWrapPreference(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === WRAP_KEY || event.key === null) listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
