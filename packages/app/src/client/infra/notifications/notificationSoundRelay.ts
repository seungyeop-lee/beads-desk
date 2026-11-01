import { heldSharedLockNames, holdSharedLock } from "@/client/infra/webLocks/navigatorLocks";
import { playNotificationSound } from "./notificationSound";

// 브라우저는 로드된 뒤 사용자가 한 번도 누르거나 키를 입력하지 않은 탭의 소리를 막습니다. 알림을 띄우는 탭이 그런 탭이어도
// 알림음이 나도록, 사용자가 조작한 적 있는 탭은 이 이름으로 시작하는 shared lock을 쥐고 다른 탭이 부탁하면 대신 재생합니다.
// 탭이 닫히면 브라우저가 lock을 풀어서, 닫힌 탭에 부탁하지 않습니다.
const READY_LOCK_PREFIX = "beads-desk.notification-sound-ready:";
const CHANNEL_NAME = "beads-desk.notification-sound";
/**
 * 부탁받은 탭의 답을 기다리는 시간입니다. 그 탭은 소리를 낼 수 없어도 playNotificationSound의 대기 시간이 지나면 답하는데,
 * 가려진 탭은 timer가 1초 단위로 늦춰지므로 그만큼 여유를 둡니다.
 */
const REPLY_TIMEOUT_MS = 2000;
/** 브라우저가 사용자 조작으로 기록하는 입력입니다. 이 입력이 들어올 때마다 조작 기록이 생겼는지 봅니다. */
const ACTIVATION_EVENTS = ["pointerdown", "pointerup", "keydown"] as const;

/** 탭 사이에 주고받는 메시지입니다. play는 tab에 재생을 부탁하고, played는 그 부탁에 재생했는지 답합니다. */
type SoundMessage =
  | { type: "play"; request: string; tab: string }
  | { type: "played"; request: string; played: boolean };

const thisTab = crypto.randomUUID();

/** 이 탭에서 소리를 낼 수 있는지입니다. 사용자 조작 기록을 알 수 없는 브라우저에서는 재생을 시도해 보도록 true입니다. */
export function soundAllowedHere(): boolean {
  return navigator.userActivation?.hasBeenActive ?? true;
}

/**
 * 사용자가 이 탭을 조작한 적이 있으면 lock으로 알리고, 다른 탭이 부탁하면 알림음을 재생해 결과를 답합니다.
 * 반환한 함수를 부르면 lock을 놓고 더 답하지 않습니다.
 */
export function offerNotificationSound(): () => void {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  const stopped = new AbortController();
  let releaseReady: (() => void) | null = null;
  channel.addEventListener("message", (event: MessageEvent<SoundMessage>) => {
    const message = event.data;
    if (message.type !== "play" || message.tab !== thisTab) return;
    void playNotificationSound().then((played) => {
      if (stopped.signal.aborted) return;
      channel.postMessage({
        type: "played",
        request: message.request,
        played,
      } satisfies SoundMessage);
    });
  });
  const markReady = () => {
    if (releaseReady || !navigator.userActivation?.hasBeenActive) return;
    releaseReady = holdSharedLock(READY_LOCK_PREFIX + thisTab);
  };
  markReady();
  for (const type of ACTIVATION_EVENTS) {
    window.addEventListener(type, markReady, { capture: true, signal: stopped.signal });
  }
  return () => {
    stopped.abort();
    releaseReady?.();
    channel.close();
  };
}

/** 사용자가 조작한 적 있어 알림음을 대신 재생할 수 있는 다른 탭입니다. */
export async function soundReadyTabs(): Promise<string[]> {
  return (await heldSharedLockNames(READY_LOCK_PREFIX)).filter((tab) => tab !== thisTab);
}

/** tab에 알림음 재생을 부탁하고, 재생했는지 돌려줍니다. 기다리는 시간 안에 답이 없으면 null입니다. */
export function requestNotificationSound(tab: string): Promise<boolean | null> {
  const request = crypto.randomUUID();
  const channel = new BroadcastChannel(CHANNEL_NAME);
  const answered = Promise.withResolvers<boolean | null>();
  const timer = setTimeout(() => answered.resolve(null), REPLY_TIMEOUT_MS);
  channel.addEventListener("message", (event: MessageEvent<SoundMessage>) => {
    const message = event.data;
    if (message.type === "played" && message.request === request) answered.resolve(message.played);
  });
  channel.postMessage({ type: "play", request, tab } satisfies SoundMessage);
  return answered.promise.finally(() => {
    clearTimeout(timer);
    channel.close();
  });
}
