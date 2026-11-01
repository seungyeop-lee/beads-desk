import { useEffect } from "react";
import { readHumanDecisionItems } from "@/client/infra/humanDecisions/humanDecisionItemsApiClient";
import {
  loadNoticePreference,
  saveNoticePreference,
  subscribeNoticePreference,
} from "@/client/infra/humanDecisions/noticePreferenceStore";
import { documentMessages } from "@/client/infra/locale/documentLocale";
import {
  type NotificationAccess,
  notificationAccess,
  requestNotificationAccess,
  showBrowserNotification,
} from "@/client/infra/notifications/browserNotifications";
import { subscribeWatchedWorkspaceChanges } from "@/client/infra/workspaceEvents/workspaceEventSource";
import {
  attendedWorkspaces,
  holdWorkspaceAttention,
} from "@/client/infra/workspaces/workspaceAttention";
import {
  createHumanDecisionTracker,
  type HumanDecisionNotice,
} from "@/client/modules/humanDecisions/domain/humanDecisionNotices";
import {
  createReadCoalescer,
  type ReadCoalescer,
} from "@/client/modules/workspace/application/readCoalescer";
import { workspaceHref } from "@/shared/contract/workspaces";

const tracker = createHumanDecisionTracker();
/** 이 탭이 SSE 연결을 연 동안 그 연결이 감시하는 workspace입니다. 다른 탭이 연결을 열었으면 비어 있습니다. */
let watched: readonly string[] = [];
/** workspace마다 판단 기다림을 읽는 읽기 묶음입니다. */
const readings = new Map<string, ReadCoalescer>();

/**
 * 판단 기다림이 새로 생기면 브라우저 알림을 띄웁니다. 알릴지는 SSE 연결을 연 탭 하나만 판단하므로 탭이 여러 개여도 한 번만 뜨고,
 * 그 연결이 감시하는 workspace, 곧 열린 탭들이 보는 workspace를 모두 알립니다.
 * 상단 탭의 개수는 가려진 탭에서 갱신되지 않으므로 쓰지 않고, 변경 알림을 받을 때마다 그 workspace를 지정해 따로 읽습니다.
 * 연결을 연 탭이 다른 탭에서 보고 있는 workspace도 알리지 않도록, 탭마다 사용자가 이 탭의 workspace를 보고 있는지 표시합니다.
 */
export function useHumanDecisionNotices(workspace: string) {
  useEffect(watchHumanDecisionNotices, []);
  useEffect(() => holdWorkspaceAttention(workspace), [workspace]);
}

export function watchHumanDecisionNotices(): () => void {
  const stopChanges = subscribeWatchedWorkspaceChanges((change) => {
    watched = change.watched;
    tracker.retain(watched);
    readIfEnabled(change.changed);
  });
  const stopPreference = subscribeNoticePreference(() => readIfEnabled(watched));
  return () => {
    stopChanges();
    stopPreference();
  };
}

/**
 * 권한을 요청하고, 허용되면 알림을 켭니다. 브라우저가 사용자 조작 없이 한 권한 요청을 막으므로 클릭 처리에서 부릅니다.
 * 거부되면 켜지 않고, 지금의 권한 상태를 돌려줍니다.
 */
export async function turnOnHumanDecisionNotices(): Promise<NotificationAccess> {
  const access = await requestNotificationAccess();
  if (access === "granted") {
    saveNoticePreference(true);
    readIfEnabled(watched);
  }
  return access;
}

export function turnOffHumanDecisionNotices() {
  saveNoticePreference(false);
  readIfEnabled(watched);
}

/** 알림을 켰고 권한이 있는지입니다. 다른 포트로 서버가 뜨면 권한이 달라지므로 켠 표시만 믿지 않고 권한을 매번 확인합니다. */
export function humanDecisionNoticesEnabled(): boolean {
  return loadNoticePreference() && notificationAccess() === "granted";
}

/**
 * 알림이 꺼져 있으면 판단 기다림을 읽지 않고 기준도 버려, 다시 켰을 때 처음 읽은 목록을 기준으로 삼게 합니다.
 * 알림을 켤 때도 이 함수로 감시하는 workspace를 모두 읽어 기준을 둡니다. 다음 변경 알림 때 처음 읽으면
 * 그 변경으로 생긴 판단 기다림이 기준에 들어가 알리지 못합니다.
 */
function readIfEnabled(workspaces: readonly string[]) {
  if (!humanDecisionNoticesEnabled()) {
    tracker.clear();
    return;
  }
  for (const workspace of workspaces) void read(workspace);
}

async function read(workspace: string) {
  const coalescer = readings.get(workspace) ?? createReadCoalescer();
  readings.set(workspace, coalescer);
  try {
    await coalescer.run(async () => {
      const result = await readHumanDecisionItems(workspace);
      const attended = await attendedWorkspaces();
      // 읽는 동안 알림을 껐거나 연결이 그 workspace를 감시하지 않게 됐으면, 그 결과를 기준으로 남기지 않습니다.
      if (result.ok && humanDecisionNoticesEnabled() && watched.includes(workspace)) {
        const notice = tracker.observe(workspace, result.data, attended);
        if (notice) show(notice);
      }
      return true;
    });
  } finally {
    readings.delete(workspace);
  }
}

function show(notice: HumanDecisionNotice) {
  const messages = documentMessages();
  showBrowserNotification({
    title: messages.humanDecisions.noticeTitle(notice.workspace),
    body: messages.humanDecisions.noticeBody(
      notice.firstTitle || messages.common.untitled,
      notice.moreCount,
    ),
    url: workspaceHref(notice.workspace, "/human"),
  });
}
