// 판단 기다림 알림의 켠 표시는 서버가 처음 그리는 화면에 필요 없어 cookie 대신 localStorage에 둡니다.
// localStorage는 cookie와 달리 알림 권한처럼 origin마다 따로라서, 다른 포트로 서버가 뜨면 권한과 함께 켠 표시도 새로 정합니다.
const PREFERENCE_KEY = "beads-desk.human-decision-notices";

/** 사용자가 판단 기다림 알림을 켰는지입니다. 알림을 띄울 수 있는지는 권한도 함께 봐야 합니다. */
export function loadNoticePreference(): boolean {
  try {
    return localStorage.getItem(PREFERENCE_KEY) === "on";
  } catch {
    return false;
  }
}

export function saveNoticePreference(on: boolean) {
  try {
    if (on) localStorage.setItem(PREFERENCE_KEY, "on");
    else localStorage.removeItem(PREFERENCE_KEY);
  } catch {
    // 저장소를 쓸 수 없으면 켠 표시를 남기지 못합니다. 이 탭에서도 켜지지 않은 것으로 보입니다.
  }
}

/** 다른 탭에서 알림을 켜거나 끄면 listener를 호출합니다. 같은 탭에서 바꾼 것은 알리지 않습니다. */
export function subscribeNoticePreference(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFERENCE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
