import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import {
  saveNoticePreference,
  saveNoticeSoundPreference,
} from "@/client/infra/humanDecisions/noticePreferenceStore";
import { koMessages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { HumanDecisionNoticeToggle } from "./HumanDecisionNoticeToggle";

/** 권한 상태를 정해 두는 Notification입니다. requestPermission은 정해 둔 결과로 권한을 바꿉니다. */
function stubNotification(permission: NotificationPermission, answer = permission) {
  const requestPermission = vi.fn<() => Promise<NotificationPermission>>(async () => {
    FakeNotification.permission = answer;
    return answer;
  });
  const FakeNotification = { permission, requestPermission };
  vi.stubGlobal("Notification", FakeNotification);
  return requestPermission;
}

function renderToggle() {
  return render(
    <LocaleProvider locale="ko">
      <HumanDecisionNoticeToggle />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  saveNoticePreference(false);
  saveNoticeSoundPreference(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  saveNoticePreference(false);
  saveNoticeSoundPreference(true);
});

test("켜면 권한을 요청하고, 허용되면 켜진 상태로 보인다", async () => {
  const requestPermission = stubNotification("default", "granted");
  const screen = await renderToggle();
  const toggle = screen.getByRole("checkbox", { name: koMessages.settings.humanDecisionNotices });
  expect(requestPermission).not.toHaveBeenCalled();

  await toggle.click();

  await expect.element(toggle).toBeChecked();
  expect(requestPermission).toHaveBeenCalledOnce();
});

test("권한 요청을 거부하면 꺼진 채 켤 수 없게 되고, 차단됐다는 설명이 계속 보인다", async () => {
  stubNotification("default", "denied");
  const screen = await renderToggle();
  const toggle = screen.getByRole("checkbox", { name: koMessages.settings.humanDecisionNotices });

  await toggle.click();

  await expect.element(toggle).not.toBeChecked();
  await expect.element(toggle).toBeDisabled();
  await expect.element(toggle).toHaveAccessibleDescription(koMessages.settings.notificationsDenied);
});

test("켜 둔 뒤 브라우저에서 권한을 거부했으면 꺼진 상태와 차단 설명을 보인다", async () => {
  saveNoticePreference(true);
  stubNotification("denied");
  const screen = await renderToggle();
  const toggle = screen.getByRole("checkbox", { name: koMessages.settings.humanDecisionNotices });

  await expect.element(toggle).not.toBeChecked();
  await expect.element(toggle).toHaveAccessibleDescription(koMessages.settings.notificationsDenied);
});

test("알림을 켜 두면 알림음이 처음에 켜져 있고, 끈 값은 설정을 다시 열어도 유지된다", async () => {
  saveNoticePreference(true);
  stubNotification("granted");
  const screen = await renderToggle();
  const sound = screen.getByRole("checkbox", {
    name: koMessages.settings.humanDecisionNoticeSound,
  });
  await expect.element(sound).toBeChecked();

  await sound.click();
  await expect.element(sound).not.toBeChecked();
  await screen.unmount();

  const reopened = await renderToggle();
  await expect
    .element(reopened.getByRole("checkbox", { name: koMessages.settings.humanDecisionNoticeSound }))
    .not.toBeChecked();
});

test("알림이 꺼져 있으면 알림음은 고른 값을 보여 주기만 하고 바꿀 수 없다", async () => {
  stubNotification("default");
  const screen = await renderToggle();
  const sound = screen.getByRole("checkbox", {
    name: koMessages.settings.humanDecisionNoticeSound,
  });

  await expect.element(sound).toBeChecked();
  await expect.element(sound).toBeDisabled();
});
