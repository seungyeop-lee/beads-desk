import Link from "next/link";
import { type ReactNode, useId } from "react";
import type { LinkedIssue } from "@/client/modules/issues/domain/issueRelations";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { StatusChip } from "../IssueChip";
import { dependencyLabel } from "../issueLabels";

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
            <li
              key={`${side}:${link.dependencyType}:${link.id}`}
              className="group relative -mx-2 flex flex-col gap-0.5 rounded-lg px-2 py-1.5 hover:bg-base-content/5"
            >
              {/* 링크가 항목 전체를 덮어 두 줄 어디를 눌러도 이동합니다. 지우기 단추는 relative로 링크 위에 둡니다. */}
              <Link
                className="absolute inset-0 rounded-lg"
                href={issueHref(link.id)}
                scroll={false}
                title={`${link.id} ${link.title}`}
                aria-label={`${link.id} ${link.title}`}
              />
              <div className="flex h-6 items-center gap-2">
                <span className="shrink-0 text-xs text-base-content/50">
                  {dependencyLabel(messages, side, link.dependencyType)}
                </span>
                <span className="min-w-0 grow truncate font-mono text-xs text-base-content/55">
                  {link.id}
                </span>
                <StatusChip status={link.status} />
                {edit && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square relative text-base-content/50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={messages.dependencyList.remove(link.id)}
                    disabled={edit.disabled}
                    onClick={() => edit.onRemove({ side, link })}
                  >
                    <CloseIcon width={13} height={13} />
                  </button>
                )}
              </div>
              <span className="truncate text-sm group-hover:underline">{link.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
