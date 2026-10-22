import { type ReactNode, useId } from "react";
import type { LinkedIssue } from "@/client/modules/issues/domain/issueRelations";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { StatusChip } from "../IssueChip";
import { dependencyLabel } from "../issueLabels";
import { CoveredIssueIdButton, CoveredIssueRow } from "../CoveredIssueRow";

type Props = {
  links: LinkedIssue[];
  issueHref: (issueId: string) => string;
  /** 없으면 의존 관계를 지우는 단추 없이 읽기 전용으로 보입니다. */
  edit?: DependencyEdit;
  /** 제목 줄 오른쪽에 두는 링크입니다. */
  actions?: ReactNode;
};

type DependencyEdit = {
  disabled: boolean;
  onRemove: (row: LinkedIssue) => void;
};

export function DependencyList({ links, issueHref, edit, actions }: Props) {
  const messages = useMessages();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 id={headingId} className="caption">
          {messages.issueDetail.linkedIssues}
        </h3>
        {actions}
      </div>
      {links.length > 0 && (
        <ul className="flex flex-col">
          {links.map(({ side, link }) => (
            <CoveredIssueRow
              key={`${side}:${link.dependencyType}:${link.id}`}
              as="li"
              className="group -mx-2 flex flex-col gap-0.5 rounded-lg px-2 py-1.5 hover:bg-base-content/5"
              coverClassName="inset-0 rounded-lg"
              coverTooltip={`${link.id} ${link.title}`}
              issueId={link.id}
              title={link.title}
              cover={{ href: issueHref(link.id) }}
            >
              <div className="flex h-6 items-center gap-2">
                <span className="shrink-0 text-xs text-emphasis-50">
                  {dependencyLabel(messages, side, link.dependencyType)}
                </span>
                <CoveredIssueIdButton
                  issueId={link.id}
                  className="min-w-0 truncate rounded text-xs text-emphasis-60"
                />
                <span className="grow" />
                <StatusChip status={link.status} />
                {edit && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square relative text-emphasis-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={messages.dependencyList.remove(link.id)}
                    disabled={edit.disabled}
                    onClick={() => edit.onRemove({ side, link })}
                  >
                    <CloseIcon width={13} height={13} />
                  </button>
                )}
              </div>
              <span className="truncate text-sm group-hover:underline">{link.title}</span>
            </CoveredIssueRow>
          ))}
        </ul>
      )}
    </section>
  );
}
