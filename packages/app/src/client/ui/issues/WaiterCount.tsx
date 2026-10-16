import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * 이 이슈가 닫히기를 기다리는 이슈 수(대기 수)를 텍스트로 보입니다. 0이면 그리지 않습니다.
 * 지금 화면의 행 전체가 링크라 링크를 중첩할 수 없으므로, 이 표시는 어느 화면에서도 링크로 만들지 않습니다.
 */
export function WaiterCount({ count, className = "" }: { count: number; className?: string }) {
  const messages = useMessages();
  if (count === 0) return null;
  return (
    <span
      className={`shrink-0 font-mono text-xs text-base-content/55 tabular-nums ${className}`}
      title={messages.issue.waitersHint(count)}
    >
      {messages.issue.waiters(count)}
    </span>
  );
}
