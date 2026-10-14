import Link from "next/link";
import { useId } from "react";
import type { LinkedIssue } from "@/client/modules/issues/domain/issueRelations";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { dependencyLabel, statusLabel, statusTone } from "../issueLabels";

type Props = {
  links: LinkedIssue[];
  issueHref: (issueId: string) => string;
  /** 없으면 의존 관계를 지우는 단추 없이 읽기 전용으로 보입니다. */
  edit?: DependencyEdit;
};

type DependencyEdit = {
  disabled: boolean;
  onRemove: (row: LinkedIssue) => void;
};

export function DependencyList({ links, issueHref, edit }: Props) {
  const messages = useMessages();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="caption">
        {messages.issueDetail.linkedIssues}
      </h3>
      {links.length > 0 && (
        <ul className="flex flex-col">
          {links.map(({ side, link }) => (
            <li
              key={`${side}:${link.dependencyType}:${link.id}`}
              className="group -mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-base-content/5"
            >
              <span className="w-20 shrink-0 text-xs text-base-content/50">
                {dependencyLabel(messages, side, link.dependencyType)}
              </span>
              <Link
                className="min-w-0 grow truncate text-sm hover:underline"
                href={issueHref(link.id)}
                scroll={false}
                title={`${link.id} ${link.title}`}
              >
                <span className="font-mono text-xs text-base-content/55">{link.id}</span>{" "}
                {link.title}
              </Link>
              <span className={`chip h-5 px-2 text-[11px] ${statusTone(link.status)}`}>
                {statusLabel(messages, link.status)}
              </span>
              {edit && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square text-base-content/50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={messages.dependencyList.remove(link.id)}
                  disabled={edit.disabled}
                  onClick={() => edit.onRemove({ side, link })}
                >
                  <CloseIcon width={13} height={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
