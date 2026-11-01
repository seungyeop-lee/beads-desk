import { playNotificationSound } from "@/client/infra/notifications/notificationSound";
import {
  requestNotificationSound,
  soundAllowedHere,
  soundReadyTabs,
} from "@/client/infra/notifications/notificationSoundRelay";

/**
 * 알림음을 탭 하나에서 재생하고, 재생했는지 돌려줍니다. 이 탭에서 소리를 낼 수 있으면 직접 재생하고,
 * 낼 수 없으면 사용자가 조작한 적 있는 다른 탭에 차례로 부탁합니다. 재생한 탭이 나오면 더 부탁하지 않습니다.
 */
export async function playNoticeSound(): Promise<boolean> {
  if (soundAllowedHere() && (await playNotificationSound())) return true;
  for (const tab of await soundReadyTabs()) {
    const played = await requestNotificationSound(tab);
    // 답하지 않은 탭이 늦게라도 재생할 수 있어서, 다음 탭에 부탁하면 알림음이 두 번 날 수 있습니다.
    if (played !== false) return played === true;
  }
  return false;
}
