import { epicPercent } from "@/client/modules/epics/domain/epicsView";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * 에픽의 직접 하위 이슈 중 닫힌 비율을 막대와 `닫힌 수/전체 수 · %`로 보입니다.
 * 막대와 글자를 감싸지 않고 나란히 돌려주므로, 둘의 배치는 부르는 쪽이 정합니다.
 */
export function EpicProgress({
  epicId,
  closed,
  total,
  barClassName,
}: {
  epicId: string;
  closed: number;
  total: number;
  barClassName: string;
}) {
  return (
    <>
      <EpicProgressBar epicId={epicId} closed={closed} total={total} className={barClassName} />
      <span className="whitespace-nowrap font-mono text-xs text-emphasis-60 tabular-nums">
        {closed}/{total} · {epicPercent(closed, total)}%
      </span>
    </>
  );
}

export function EpicProgressBar({
  epicId,
  closed,
  total,
  className,
}: {
  epicId: string;
  closed: number;
  total: number;
  className: string;
}) {
  const messages = useMessages();
  return (
    <progress
      className={`progress h-1.5 text-progress ${className}`}
      value={closed}
      max={Math.max(total, 1)}
      aria-label={messages.epics.progress(epicId)}
    />
  );
}
