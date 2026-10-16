import Link from "next/link";
import { blockersOf } from "@/client/modules/humanGates/domain/humanGateBlockers";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HumanGateChip } from "./HumanGateChip";

type Props = {
  issueId: string;
  blockedBy: string[];
  /** 표에 없는 이슈면 undefined를 돌려줍니다. 그때는 id만 보입니다. */
  titleOf: (issueId: string) => string | undefined;
  humanGateTitles: ReadonlyMap<string, string>;
  issueHref: (issueId: string) => string;
};

/**
 * 의존 관계 때문에 막힌 이슈가 무엇을 기다리는지 한 줄로 보여 줍니다. 첫 번째 선행 이슈의 상세를 바로 열 수 있습니다.
 * 열린 human gate가 막고 있으면 그 gate를 먼저 보이고, 누르면 막힌 이슈의 상세를 엽니다. 상세에서 gate를 바로 승인할 수 있습니다.
 */
export function BlockerLine({ issueId, blockedBy, titleOf, humanGateTitles, issueHref }: Props) {
  const messages = useMessages();
  const [first, ...rest] = blockersOf(blockedBy, humanGateTitles, titleOf);
  if (!first) return null;
  const title = first.title || messages.common.untitled;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-base-content/60">
      {first.humanGate ? (
        <>
          <HumanGateChip />
          <Link
            href={issueHref(issueId)}
            scroll={false}
            className="min-w-0 truncate hover:underline"
            aria-label={messages.humanGate.waitingOn(title)}
          >
            ← {title}
          </Link>
        </>
      ) : (
        <>
          <span className="chip tone-coral h-5 px-2 text-[11px]">{messages.blocking.chip}</span>
          <Link
            href={issueHref(first.id)}
            scroll={false}
            className="min-w-0 truncate hover:underline"
            aria-label={messages.blocking.waitingOn(first.id)}
          >
            ← <span className="font-mono">{first.id}</span> {first.title}
          </Link>
        </>
      )}
      {rest.length > 0 && <span className="shrink-0">{messages.blocking.more(rest.length)}</span>}
    </span>
  );
}
