import Link from "next/link";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

type Props = {
  blockedBy: string[];
  /** 표에 없는 이슈면 undefined를 돌려줍니다. 그때는 id만 보입니다. */
  titleOf: (issueId: string) => string | undefined;
  issueHref: (issueId: string) => string;
};

/** 의존 관계 때문에 막힌 이슈가 무엇을 기다리는지 한 줄로 보여 줍니다. 첫 번째 선행 이슈의 상세를 바로 열 수 있습니다. */
export function BlockerLine({ blockedBy, titleOf, issueHref }: Props) {
  const messages = useMessages();
  const [first, ...rest] = blockedBy;
  if (!first) return null;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-base-content/60">
      <span className="chip tone-coral h-5 px-2 text-[11px]">{messages.blocking.chip}</span>
      <Link
        href={issueHref(first)}
        scroll={false}
        className="min-w-0 truncate hover:underline"
        aria-label={messages.blocking.waitingOn(first)}
      >
        ← <span className="font-mono">{first}</span> {titleOf(first)}
      </Link>
      {rest.length > 0 && <span className="shrink-0">{messages.blocking.more(rest.length)}</span>}
    </span>
  );
}
