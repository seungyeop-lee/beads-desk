import type { IssueLink, IssueStatus } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useState } from "react";
import { DEPENDENCY_LABELS, STATUS_BADGES, STATUS_LABELS } from "../issueLabels";

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
      <h3 className="text-sm font-semibold">{title}</h3>
      {links.length > 0 && (
        <ul className="flex flex-col gap-1">
          {links.map((link) => (
            <li
              key={`${link.dependencyType}:${link.id}`}
              className="flex items-start gap-1 text-sm"
            >
              <span className="badge badge-ghost badge-xs mt-1 shrink-0">
                {DEPENDENCY_LABELS[side][link.dependencyType] ?? link.dependencyType}
              </span>
              <Link
                className="link link-hover min-w-0 grow"
                href={issueHref(link.id)}
                scroll={false}
              >
                <span className="font-mono text-xs">{link.id}</span> {link.title}
              </Link>
              <span
                className={`badge badge-xs mt-1 shrink-0 ${STATUS_BADGES[link.status as IssueStatus] ?? "badge-ghost"}`}
              >
                {STATUS_LABELS[link.status as IssueStatus] ?? link.status}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs shrink-0"
                aria-label={`${link.id} 의존 관계 지우기`}
                disabled={disabled}
                onClick={() => onRemove(link)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="join"
        onSubmit={async (event) => {
          event.preventDefault();
          if (draft.trim() && (await onAdd(draft.trim()))) setDraft("");
        }}
      >
        <input
          className="input input-xs join-item w-full font-mono"
          aria-label={`${title}에 추가할 이슈 id`}
          placeholder="이슈 id"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="btn btn-xs join-item" disabled={disabled}>
          추가
        </button>
      </form>
    </section>
  );
}
