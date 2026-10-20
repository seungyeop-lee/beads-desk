/** 브라우저가 Notification API를 지원하지 않으면 `unsupported`입니다. */
export type NotificationAccess = NotificationPermission | "unsupported";

// 켠 표시는 서버가 처음 그리는 화면에 필요 없어 cookie 대신 localStorage에 둡니다. localStorage는 cookie와 달리
// 알림 권한처럼 origin마다 따로라서, 다른 포트로 서버가 뜨면 권한과 함께 켠 표시도 새로 정합니다.
const PREFERENCE_KEY = "beads-desk.human-decision-notices";

export function notificationAccess(): NotificationAccess {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

/**
 * 권한을 요청합니다. Firefox와 Safari는 사용자 조작 없이 한 요청을 막으므로 클릭 처리 안에서 부릅니다.
 * 이미 허용했거나 거부했으면 브라우저가 묻지 않고 그 상태를 돌려줍니다.
 */
export async function requestNotificationAccess(): Promise<NotificationAccess> {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.requestPermission();
}

/**
 * 운영체제 알림 영역에 알림을 띄웁니다. tag가 같은 알림은 이전 알림을 대체합니다.
 * 클릭하면 알림을 만든 탭으로 focus를 옮기는 기본 동작을 막고 url을 새 탭으로 열어, 보던 탭의 화면을 그대로 둡니다.
 */
export function showBrowserNotification(notice: {
  title: string;
  body: string;
  tag: string;
  url: string;
}) {
  if (notificationAccess() !== "granted") return;
  let notification: Notification;
  try {
    notification = new Notification(notice.title, { body: notice.body, tag: notice.tag });
  } catch {
    // Service Worker로만 알림을 띄울 수 있는 브라우저는 생성자가 실패합니다. 알림만 띄우지 않습니다.
    return;
  }
  notification.addEventListener("click", (event) => {
    event.preventDefault();
    window.open(notice.url, "_blank");
    notification.close();
  });
}

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
