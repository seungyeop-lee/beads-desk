import { ISSUE_STATUSES, type IssueStatus } from "@beads-desk/bd/issue";
import {
  toggleStatusFilter,
  type IssueListRefinement,
} from "@/client/modules/issues/domain/issueListView";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { READY_LABEL, STATUS_LABELS, TYPE_LABELS } from "./issueLabels";

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
    <div className="flex flex-wrap items-center gap-2">
      <fieldset className="join">
        <legend className="sr-only">상태</legend>
        <button
          type="button"
          className={`btn btn-sm join-item ${allStatuses ? "btn-active" : ""}`}
          aria-pressed={allStatuses}
          onClick={() => onFilterChange({ kind: "status", statuses: [] })}
        >
          전체
        </button>
        <button
          type="button"
          className={`btn btn-sm join-item ${filter.kind === "ready" ? "btn-active" : ""}`}
          aria-pressed={filter.kind === "ready"}
          onClick={() => onFilterChange(toggleStatusFilter(filter, "ready"))}
        >
          {READY_LABEL}
        </button>
        {ISSUE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`btn btn-sm join-item ${isSelected(status) ? "btn-active" : ""}`}
            aria-pressed={isSelected(status)}
            onClick={() => onFilterChange(toggleStatusFilter(filter, status))}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </fieldset>

      <details className="dropdown">
        <summary className="btn btn-sm">
          {refinement.types.length === 0 ? "유형: 전체" : `유형 ${refinement.types.length}개`}
        </summary>
        <ul className="menu dropdown-content z-10 w-40 rounded-box bg-base-100 p-2 shadow">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <li key={type}>
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={refinement.types.includes(type)}
                  onChange={() => toggleType(type)}
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </details>

      <input
        type="search"
        className="input input-sm w-56"
        placeholder="id 또는 제목 검색"
        aria-label="검색"
        value={refinement.search}
        onChange={(event) => onRefinementChange({ ...refinement, search: event.target.value })}
      />
    </div>
  );
}
