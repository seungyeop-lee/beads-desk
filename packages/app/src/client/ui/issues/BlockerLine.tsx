import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import {
  blockersOf,
  type Blocker,
  type HumanGateTitles,
} from "@/client/modules/humanGates/domain/humanGateBlockers";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HumanGateChip } from "./HumanGateChip";
import { IssueChip } from "./IssueChip";

/*
 * 막는 이슈를 가리키는 표시는 모두 이 파일에 둔다. 화살표와 사람 확인 기다림 칩, 남은 개수 문구의 규칙이
 * 한 곳에서 유지되므로, 표시가 놓인 자리의 정렬이나 링크 여부만 각 표시가 따로 정한다.
 */

type Props = {
  issueId: string;
  blockedBy: string[];
  /** 표에 없는 이슈면 undefined를 돌려줍니다. 그때는 id만 보입니다. */
  titleOf: (issueId: string) => string | undefined;
  humanGateTitles: HumanGateTitles;
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
          <IssueChip tone="tone-coral">{messages.blocking.chip}</IssueChip>
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

/** 보드 카드 안의 막는 이슈 표시입니다. 카드 전체가 링크라 표시 안에는 링크를 두지 않습니다. */
export function BoardBlockerLine({ blockers }: { blockers: Blocker[] }) {
  const messages = useMessages();
  const [blocker, ...rest] = blockers;
  if (!blocker) return null;
  return (
    <>
      {blocker.humanGate && (
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-base-content/60">
          ← <HumanGateChip />
          <span className="min-w-0 break-words">{blocker.title || messages.common.untitled}</span>
          {rest.length > 0 && messages.blocking.more(rest.length)}
        </span>
      )}
      {!blocker.humanGate && (
        <span className="text-xs text-base-content/60">
          ← {messages.blocking.waitingOn(blocker.id)}
          {rest.length > 0 && ` ${messages.blocking.more(rest.length)}`}
        </span>
      )}
    </>
  );
}

/** 포커스 화면의 행 아래에 막는 이슈를 하나씩 나열해 보입니다. 행 전체가 링크라 표시 안에는 링크를 두지 않습니다. */
export function WaitingOnLines({ blockers }: { blockers: Blocker[] }) {
  const messages = useMessages();
  return (
    <>
      {blockers.map((blocker) =>
        blocker.humanGate ? (
          <span
            key={blocker.id}
            className="flex min-w-0 items-center gap-1.5 pl-19 text-xs text-base-content/60"
          >
            ←
            <HumanGateChip />
            <span className="truncate">{blocker.title || messages.common.untitled}</span>
          </span>
        ) : (
          <span key={blocker.id} className="truncate pl-19 text-xs text-base-content/60">
            ← {blocker.id} {blocker.title}
          </span>
        ),
      )}
    </>
  );
}

/** 사람 결정 목록의 한 줄 아래에, gate가 막고 있는 첫 작업과 남은 작업 수를 보입니다. */
export function FirstBlockedLine({ blocks }: { blocks: Issue[] }) {
  const messages = useMessages();
  const [first, ...rest] = blocks;
  if (!first) return null;
  return (
    <span className="wrap-anywhere text-xs text-base-content/60">
      ← {first.title || messages.common.untitled}
      {rest.length > 0 && ` ${messages.blocking.more(rest.length)}`}
    </span>
  );
}
