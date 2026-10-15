import { useEffect, useRef } from "react";
import type {
  IssueDateField,
  IssueDateFilter,
} from "@/client/modules/issues/domain/issueDateFilter";
import { ChevronDownIcon, SearchIcon } from "@/client/ui/designSystem/icons";
import { ISSUE_TYPES, typeLabel, typeTone } from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

type Props = {
  /** 비어 있으면 모든 유형을 보입니다. */
  types: readonly string[];
  onTypesChange: (types: string[]) => void;
  search: string;
  onSearchChange: (search: string) => void;
  dates: IssueDateFilter;
  onDatesChange: (dates: IssueDateFilter) => void;
};

const DATE_FIELDS: IssueDateField[] = ["created", "closed"];

/** 고른 보기 탭 안에서 유형, 날짜, 검색어로 결과를 좁힙니다. */
export function IssueFilterBar({
  types,
  onTypesChange,
  search,
  onSearchChange,
  dates,
  onDatesChange,
}: Props) {
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
    onTypesChange(
      types.includes(type) ? types.filter((selected) => selected !== type) : [...types, type],
    );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <details ref={typeMenuRef} className="dropdown">
        <summary className="btn btn-sm btn-ghost gap-1.5 rounded-full font-medium">
          {messages.issue.type}
          <span className="text-base-content/50">
            {types.length === 0
              ? messages.issues.allTypes
              : messages.issues.typeCount(types.length)}
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
                  checked={types.includes(type)}
                  onChange={() => toggleType(type)}
                />
                <span className={`tone-dot ${typeTone(type)}`} />
                {typeLabel(messages, type)}
              </label>
            </li>
          ))}
        </ul>
      </details>

      <fieldset aria-label={messages.issues.dates} className="flex items-center gap-1.5">
        <select
          className="select select-sm w-28 rounded-full"
          aria-label={messages.issues.dateField}
          value={dates.field}
          onChange={(event) =>
            onDatesChange({ ...dates, field: event.target.value as IssueDateField })
          }
        >
          {DATE_FIELDS.map((field) => (
            <option key={field} value={field}>
              {messages.issues.dateFields[field]}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input input-sm w-36 rounded-full"
          aria-label={messages.issues.dateFrom}
          value={dates.from ?? ""}
          onChange={(event) => onDatesChange({ ...dates, from: event.target.value || null })}
        />
        <span className="text-base-content/40">~</span>
        <input
          type="date"
          className="input input-sm w-36 rounded-full"
          aria-label={messages.issues.dateTo}
          value={dates.to ?? ""}
          onChange={(event) => onDatesChange({ ...dates, to: event.target.value || null })}
        />
        {(dates.from || dates.to) && (
          <button
            type="button"
            className="btn btn-ghost btn-xs rounded-full"
            onClick={() => onDatesChange({ ...dates, from: null, to: null })}
          >
            {messages.issues.clearDates}
          </button>
        )}
      </fieldset>

      <label className="input input-sm ml-auto w-64 rounded-full">
        <SearchIcon width={15} height={15} className="text-base-content/40" />
        <input
          type="search"
          className="grow"
          placeholder={messages.issues.searchPlaceholder}
          aria-label={messages.issues.search}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
    </div>
  );
}
