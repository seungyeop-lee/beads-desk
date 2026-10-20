import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * 에픽의 직접 하위 이슈 중 닫힌 비율을 막대와 `닫힌 수/전체 수 · %`로 보입니다.
 * 막대와 글자를 감싸지 않고 나란히 돌려주므로, 둘의 폭과 배치는 부르는 쪽이 className으로 정합니다.
 */
export function EpicProgress({
  epicId,
  closed,
  total,
  barClassName,
  countClassName,
}: {
  epicId: string;
  closed: number;
  total: number;
  barClassName: string;
  countClassName?: string;
}) {
  const messages = useMessages();
  const percent = total === 0 ? 0 : Math.round((closed / total) * 100);
  return (
    <>
      <progress
        className={`progress h-1.5 text-[color-mix(in_oklab,var(--color-sage),#3f6212_40%)] ${barClassName}`}
        value={closed}
        max={Math.max(total, 1)}
        aria-label={messages.epics.progress(epicId)}
      />
      <span
        className={`whitespace-nowrap font-mono text-xs text-base-content/55 tabular-nums ${countClassName ?? ""}`}
      >
        {closed}/{total} · {percent}%
      </span>
    </>
  );
}
