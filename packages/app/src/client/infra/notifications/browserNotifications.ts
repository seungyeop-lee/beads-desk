/** 브라우저가 Notification API를 지원하지 않으면 `unsupported`입니다. */
export type NotificationAccess = NotificationPermission | "unsupported";

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
 * 운영체제 알림 영역에 알림을 띄웁니다. 앞서 띄운 알림을 대체하지 않고 매번 새 알림으로 띄우도록 tag를 붙이지 않습니다.
 * macOS의 Chrome은 같은 tag의 알림을 대체할 때 renotify를 켜도 배너를 띄우지 않아, 사용자가 두 번째 알림부터 알아채지 못합니다.
 * 클릭하면 알림을 만든 탭으로 focus를 옮기는 기본 동작을 막고 url을 새 탭으로 열어, 보던 탭의 화면을 그대로 둡니다.
 */
export function showBrowserNotification(notice: { title: string; body: string; url: string }) {
  if (notificationAccess() !== "granted") return;
  let notification: Notification;
  try {
    notification = new Notification(notice.title, { body: notice.body });
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
