import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { showBrowserNotification } from "./browserNotifications";

/** 만든 알림의 인자를 남기는 Notification입니다. 권한은 허용 상태입니다. */
class FakeNotification extends EventTarget {
  static permission: NotificationPermission = "granted";
  static created: FakeNotification[] = [];
  closed = false;

  constructor(
    readonly title: string,
    readonly options: NotificationOptions,
  ) {
    super();
    FakeNotification.created.push(this);
  }

  close() {
    this.closed = true;
  }
}

const notice = (body: string, silent = false) => ({
  title: "acme: 판단 기다림",
  body,
  url: "/w/acme/human",
  silent,
});

beforeEach(() => {
  FakeNotification.created = [];
  vi.stubGlobal("Notification", FakeNotification);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("알림을 연달아 띄우면 앞 알림을 대체하지 않도록 tag 없이 매번 새 알림으로 만든다", () => {
  showBrowserNotification(notice("배포 승인"));
  showBrowserNotification(notice("어느 방식으로 할까요"));

  expect(FakeNotification.created.map(({ options }) => options)).toEqual([
    { body: "배포 승인", silent: false },
    { body: "어느 방식으로 할까요", silent: false },
  ]);
});

test("silent를 켜면 운영체제 알림음을 내지 않는 알림으로 만든다", () => {
  showBrowserNotification(notice("배포 승인", true));

  expect(FakeNotification.created[0]!.options).toEqual({ body: "배포 승인", silent: true });
});

test("알림을 클릭하면 보던 탭으로 focus를 옮기지 않고 url을 새 탭으로 열고 알림을 닫는다", () => {
  const open = vi.fn<typeof window.open>();
  vi.stubGlobal("window", { open });
  showBrowserNotification(notice("배포 승인"));
  const click = new Event("click", { cancelable: true });

  FakeNotification.created[0]!.dispatchEvent(click);

  expect(click.defaultPrevented).toBe(true);
  expect(open).toHaveBeenCalledExactlyOnceWith("/w/acme/human", "_blank");
  expect(FakeNotification.created[0]!.closed).toBe(true);
});
