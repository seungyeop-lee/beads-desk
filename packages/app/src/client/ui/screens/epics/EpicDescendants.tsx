import type { Issue } from "@beads-desk/bd/issue";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useEpicDescendants } from "@/client/modules/epics/application/useEpics";
import {
  childProgress,
  epicDescendantRows,
  notChildCandidate,
} from "@/client/modules/epics/domain/epicsView";
import type { GateTitles } from "@/client/modules/gates/domain/humanGateBlockers";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { useIssueCreation } from "@/client/modules/issues/application/useIssueCreation";
import { IssueConfirmPicker } from "@/client/ui/issues/IssueConfirmPicker";
import { NewIssueDialog } from "@/client/ui/issues/NewIssueDialog";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { PlusIcon } from "@/client/ui/designSystem/icons";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useGraphHref } from "@/client/ui/address/useGraphHref";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

export function EpicDescendants({
  epic,
  revealed,
  gateTitles,
  issueHref,
  writes,
}: {
  epic: Issue;
  revealed: ReadonlySet<string>;
  gateTitles: GateTitles;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
}) {
  const { data, error } = useEpicDescendants(epic.id);
  const descendants = data?.issues;
  const waiters = useMemo(() => new Map(Object.entries(data?.waiters ?? {})), [data]);
  const progress = useMemo(() => childProgress(data?.issues ?? []), [data]);
  const revealedRows = new Set(
    descendants?.filter(({ id }) => revealed.has(id)).map(({ id }) => id),
  );
  const router = useRouter();
  const graphHref = useGraphHref();
  const messages = useMessages();
  const newIssue = useIssueCreation((issueId) =>
    router.push(issueHref(issueId), { scroll: false }),
  );
  return (
    <div className="flex flex-col gap-3 border-t border-base-300 bg-base-200/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-ghost gap-1.5 rounded-full"
          onClick={newIssue.start}
        >
          <PlusIcon width={14} height={14} />
          {messages.epics.newChild}
        </button>
        <div className="w-96 max-w-full">
          <IssueConfirmPicker
            label={messages.epics.addExistingChild}
            placeholder={messages.epics.addExistingChildPlaceholder}
            confirmLabel={messages.epics.addChildConfirm}
            disabled={writes.pending || !descendants}
            exclude={notChildCandidate(epic.id, descendants ?? [])}
            onConfirm={(issue) =>
              issueEdits(writes, epic.id).addRelation("child", issue.id, () =>
                showToast(messages.epics.childAdded(issue.id, epic.id)),
              )
            }
          />
        </div>
      </div>
      {newIssue.creating && (
        <NewIssueDialog
          fixedParent={epic}
          create={newIssue.create}
          pending={newIssue.pending}
          error={newIssue.error}
          onClose={newIssue.close}
        />
      )}
      {error && <ErrorAlert>{messages.epics.childrenLoadFailed(error)}</ErrorAlert>}
      {!descendants && !error && (
        <span className="flex items-center gap-2 text-sm text-emphasis-60">
          <span className="loading loading-spinner loading-sm" />
          {messages.epics.childrenLoading}
        </span>
      )}
      {descendants && (
        <IssueTable
          // 검색어에 맞은 하위 에픽이 접힌 행 아래에 있으면, 그 행을 펼친 표를 새로 그려 하위 에픽이 보이게 합니다.
          key={[...revealedRows].join(" ")}
          tree={epicDescendantRows(descendants)}
          initiallyExpanded={revealedRows}
          gateTitles={gateTitles}
          waiters={waiters}
          issueHref={issueHref}
          writes={writes}
          emptyMessage={messages.epics.childrenEmpty}
          epicOrderHref={(epicId) => graphHref({ kind: "epic", id: epicId })}
          epicProgress={progress}
        />
      )}
    </div>
  );
}
