import { ISSUE_STATUSES, type IssueStatus } from "@beads-desk/bd/issue";
import {
  toggleStatusFilter,
  type IssueListRefinement,
} from "@/client/modules/issues/domain/issueListView";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { ChevronDownIcon, SearchIcon } from "@/client/ui/designSystem/icons";
import {
  READY_LABEL,
  READY_TONE,
  STATUS_LABELS,
  statusTone,
  TYPE_LABELS,
  typeTone,
} from "@/client/ui/issues/issueLabels";

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
        <legend className="sr-only">상태</legend>
        <button
          type="button"
          aria-pressed={allStatuses}
          onClick={() => {
            if (!allStatuses) onFilterChange({ kind: "status", statuses: [] });
          }}
        >
          전체
        </button>
        <button
          type="button"
          aria-pressed={filter.kind === "ready"}
          onClick={() => onFilterChange(toggleStatusFilter(filter, "ready"))}
        >
          <span className={`tone-dot ${READY_TONE}`} />
          {READY_LABEL}
        </button>
        {ISSUE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={isSelected(status)}
            onClick={() => onFilterChange(toggleStatusFilter(filter, status))}
          >
            <span className={`tone-dot ${statusTone(status)}`} />
            {STATUS_LABELS[status]}
          </button>
        ))}
      </fieldset>

      <details className="dropdown">
        <summary className="btn btn-sm btn-ghost gap-1.5 rounded-full font-medium">
          유형
          <span className="text-base-content/50">
            {refinement.types.length === 0 ? "전체" : `${refinement.types.length}개`}
          </span>
          <ChevronDownIcon width={14} height={14} className="text-base-content/50" />
        </summary>
        <ul className="dropdown-content menu z-10 mt-1 w-44 rounded-box border border-base-300 bg-base-100 p-1.5 shadow-lg">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <li key={type}>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs rounded"
                  checked={refinement.types.includes(type)}
                  onChange={() => toggleType(type)}
                />
                <span className={`tone-dot ${typeTone(type)}`} />
                {label}
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
          placeholder="id 또는 제목 검색"
          aria-label="검색"
          value={refinement.search}
          onChange={(event) => onRefinementChange({ ...refinement, search: event.target.value })}
        />
      </label>
    </div>
  );
}
