import type { CSSProperties } from "react";
import { epicPercent, type ChildProgress } from "@/client/modules/epics/domain/epicsView";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * 에픽의 직접 하위 이슈 진행률을 막대와 `닫힌 수/전체 수 · %`로 보입니다.
 * 막대와 글자를 감싸지 않고 나란히 돌려주므로, 둘의 배치는 부르는 쪽이 정합니다.
 */
export function EpicProgress({
  epicId,
  closed,
  inProgress,
  total,
  barClassName,
}: ChildProgress & {
  epicId: string;
  barClassName: string;
}) {
  return (
    <>
      <EpicProgressBar
        epicId={epicId}
        closed={closed}
        inProgress={inProgress}
        total={total}
        className={barClassName}
      />
      <span className="whitespace-nowrap font-mono text-xs text-emphasis-60 tabular-nums">
        {closed}/{total} · {epicPercent(closed, total)}%
      </span>
    </>
  );
}

/**
 * 닫힌 하위 이슈 구간 뒤로 진행 중인 하위 이슈 구간을 진행 중 상태 칩과 같은 색으로 이어 그립니다.
 * native progress는 구간을 둘로 나눌 수 없어 직접 그리고, 보조 기술에는 닫힌 비율만 값으로 알립니다.
 * 막대 색은 `--color-progress`를 덮어써 바꿉니다.
 */
export function EpicProgressBar({
  epicId,
  closed,
  inProgress,
  total,
  className,
  style,
  "aria-label": label,
}: ChildProgress & {
  epicId: string;
  className: string;
  style?: CSSProperties;
  "aria-label"?: string;
}) {
  const messages = useMessages();
  const max = Math.max(total, 1);
  return (
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="progressbar"
      aria-label={label ?? messages.epics.progress(epicId)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={closed}
      className={`flex h-1.5 overflow-hidden rounded-box bg-progress/20 ${className}`}
      style={style}
    >
      <span
        className="flex overflow-hidden rounded-box"
        style={{ width: `${((closed + inProgress) / max) * 100}%` }}
      >
        <span className="bg-progress" style={{ flexGrow: closed }} />
        <span className="tone-bar tone-pear" style={{ flexGrow: inProgress }} />
      </span>
    </div>
  );
}
