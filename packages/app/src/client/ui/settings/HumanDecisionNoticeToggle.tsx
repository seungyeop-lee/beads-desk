import { useId, useState } from "react";
import {
  loadNoticeSoundPreference,
  saveNoticeSoundPreference,
} from "@/client/infra/humanDecisions/noticePreferenceStore";
import { notificationAccess } from "@/client/infra/notifications/browserNotifications";
import {
  humanDecisionNoticesEnabled,
  turnOffHumanDecisionNotices,
  turnOnHumanDecisionNotices,
} from "@/client/modules/humanDecisions/application/humanDecisionNotices";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * 판단 기다림이 생기면 브라우저 알림을 띄울지, 알림과 함께 알림음을 낼지 고르는 항목입니다. 권한은 알림을 켜는 클릭에서 요청합니다.
 * 브라우저가 알림을 막았거나 지원하지 않으면 켤 수 없으므로, 그 상태를 설명 자리에 계속 보여 줍니다.
 * 알림음은 알림이 뜰 때만 나므로, 알림이 꺼져 있으면 알림음 항목은 고른 값을 보여 주기만 하고 바꿀 수 없습니다.
 * 설정 대화상자를 열 때만 그려지므로 browser의 권한을 바로 읽습니다.
 */
export function HumanDecisionNoticeToggle() {
  const messages = useMessages();
  const hintId = useId();
  const soundHintId = useId();
  const [access, setAccess] = useState(notificationAccess);
  const [on, setOn] = useState(humanDecisionNoticesEnabled);
  const [soundOn, setSoundOn] = useState(loadNoticeSoundPreference);
  const blocked = access === "denied" || access === "unsupported";
  const hint =
    access === "denied"
      ? messages.settings.notificationsDenied
      : access === "unsupported"
        ? messages.settings.notificationsUnsupported
        : messages.settings.humanDecisionNoticesHint;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="caption">{messages.settings.notifications}</span>
      <label className="flex items-center justify-between gap-3">
        <span>{messages.settings.humanDecisionNotices}</span>
        <input
          type="checkbox"
          className="toggle toggle-primary shrink-0"
          aria-describedby={hintId}
          checked={on && !blocked}
          disabled={blocked}
          onChange={async (event) => {
            if (!event.target.checked) {
              turnOffHumanDecisionNotices();
              setOn(false);
              return;
            }
            setAccess(await turnOnHumanDecisionNotices());
            setOn(humanDecisionNoticesEnabled());
          }}
        />
      </label>
      <p id={hintId} className="text-sm text-emphasis-60">
        {hint}
      </p>
      <label className="mt-1.5 flex items-center justify-between gap-3">
        <span>{messages.settings.humanDecisionNoticeSound}</span>
        <input
          type="checkbox"
          className="toggle toggle-primary shrink-0"
          aria-describedby={soundHintId}
          checked={soundOn}
          disabled={!on || blocked}
          onChange={(event) => {
            saveNoticeSoundPreference(event.target.checked);
            setSoundOn(event.target.checked);
          }}
        />
      </label>
      <p id={soundHintId} className="text-sm text-emphasis-60">
        {messages.settings.humanDecisionNoticeSoundHint}
      </p>
    </div>
  );
}
