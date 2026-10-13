import type { IssueLink } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useState } from "react";
import { CloseIcon, PlusIcon } from "@/client/ui/designSystem/icons";
import { DEPENDENCY_LABELS, statusLabel, statusTone } from "../issueLabels";

type Props = {
  title: string;
  /** dependencies는 이 이슈가 의존하는 이슈, dependents는 이 이슈에 의존하는 이슈입니다. */
  side: "dependencies" | "dependents";
  links: IssueLink[];
  disabled: boolean;
  issueHref: (issueId: string) => string;
  /** 성공하면 true를 돌려줍니다. */
  onAdd: (issueId: string) => Promise<boolean>;
  onRemove: (link: IssueLink) => void;
};

export function DependencyList({
  title,
  side,
  links,
  disabled,
  issueHref,
  onAdd,
  onRemove,
}: Props) {
  const [draft, setDraft] = useState("");

  return (
    <section className="flex flex-col gap-2">
      <h3 className="caption">{title}</h3>
      {links.length > 0 && (
        <ul className="flex flex-col">
          {links.map((link) => (
            <li
              key={`${link.dependencyType}:${link.id}`}
              className="group -mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-base-content/5"
            >
              <span className="w-12 shrink-0 text-xs text-base-content/50">
                {DEPENDENCY_LABELS[side][link.dependencyType] ?? link.dependencyType}
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
                {statusLabel(link.status)}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square text-base-content/50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`${link.id} 의존 관계 지우기`}
                disabled={disabled}
                onClick={() => onRemove(link)}
              >
                <CloseIcon width={13} height={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex items-center gap-1.5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (draft.trim() && (await onAdd(draft.trim()))) setDraft("");
        }}
      >
        <input
          className="input input-sm grow font-mono"
          aria-label={`${title}에 추가할 이슈 id`}
          placeholder="이슈 id"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="btn btn-sm btn-square btn-ghost"
          aria-label={`${title}에 추가`}
          disabled={disabled}
        >
          <PlusIcon width={15} height={15} />
        </button>
      </form>
    </section>
  );
}
