import { ISSUE_STATUSES, type IssueStatus } from "@beads-desk/bd/issue";
import { useEffect, useRef } from "react";
import {
  toggleStatusFilter,
  type IssueListRefinement,
} from "@/client/modules/issues/domain/issueListView";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { ChevronDownIcon, SearchIcon } from "@/client/ui/designSystem/icons";
import {
  ISSUE_TYPES,
  READY_TONE,
  statusLabel,
  statusTone,
  typeLabel,
  typeTone,
} from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

type Props = {
  filter: IssueListFilter;
  refinement: IssueListRefinement;
  onFilterChange: (filter: IssueListFilter) => void;
  onRefinementChange: (refinement: IssueListRefinement) => void;
};

export function IssueFilterBar({ filter, refinement, onFilterChange, onRefinementChange }: Props) {
  const isSelected = (status: IssueStatus) =>
    filter.kind === "status" && filter.statuses.includes(status);
  const allStatuses = filter.kind === "status" && filter.statuses.length === 0;
  const typeMenuRef = useRef<HTMLDetailsElement>(null);
  const messages = useMessages();

  // details는 summary를 누를 때만 닫히므로, 목록 바깥을 누르면 직접 닫습니다.
  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const menu = typeMenuRef.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  const toggleType = (type: string) =>
    onRefinementChange({
      ...refinement,
      types: refinement.types.includes(type)
        ? refinement.types.filter((selected) => selected !== type)
        : [...refinement.types, type],
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <fieldset className="segmented">
        <legend className="sr-only">{messages.issue.status}</legend>
        <button
          type="button"
          aria-pressed={allStatuses}
          onClick={() => {
            if (!allStatuses) onFilterChange({ kind: "status", statuses: [] });
          }}
        >
          {messages.issues.allStatuses}
        </button>
        <button
          type="button"
          aria-pressed={filter.kind === "ready"}
          onClick={() => onFilterChange(toggleStatusFilter(filter, "ready"))}
        >
          <span className={`tone-dot ${READY_TONE}`} />
          {messages.issue.ready}
        </button>
        {ISSUE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={isSelected(status)}
            onClick={() => onFilterChange(toggleStatusFilter(filter, status))}
          >
            <span className={`tone-dot ${statusTone(status)}`} />
            {statusLabel(messages, status)}
          </button>
        ))}
      </fieldset>

      <details ref={typeMenuRef} className="dropdown">
        <summary className="btn btn-sm btn-ghost gap-1.5 rounded-full font-medium">
          {messages.issue.type}
          <span className="text-base-content/50">
            {refinement.types.length === 0
              ? messages.issues.allTypes
              : messages.issues.typeCount(refinement.types.length)}
          </span>
          <ChevronDownIcon width={14} height={14} className="text-base-content/50" />
        </summary>
        <ul className="dropdown-content menu z-10 mt-1 w-44 rounded-box border border-base-300 bg-base-100 p-1.5 shadow-lg">
          {ISSUE_TYPES.map((type) => (
            <li key={type}>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs rounded"
                  checked={refinement.types.includes(type)}
                  onChange={() => toggleType(type)}
                />
                <span className={`tone-dot ${typeTone(type)}`} />
                {typeLabel(messages, type)}
              </label>
            </li>
          ))}
        </ul>
      </details>

      <label className="input input-sm ml-auto w-64 rounded-full">
        <SearchIcon width={15} height={15} className="text-base-content/40" />
        <input
          type="search"
          className="grow"
          placeholder={messages.issues.searchPlaceholder}
          aria-label={messages.issues.search}
          value={refinement.search}
          onChange={(event) => onRefinementChange({ ...refinement, search: event.target.value })}
        />
      </label>
    </div>
  );
}
