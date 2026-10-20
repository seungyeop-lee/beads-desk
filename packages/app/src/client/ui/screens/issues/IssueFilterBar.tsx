import type {
  IssueDateField,
  IssueDateFilter,
} from "@/client/modules/issues/domain/issueDateFilter";
import { NO_LABEL } from "@/client/modules/issues/domain/issueLabelFilter";
import { CheckboxMenu } from "@/client/ui/designSystem/CheckboxMenu";
import { SearchField } from "@/client/ui/designSystem/SearchField";
import { ISSUE_TYPES, nameTone, typeLabel, typeTone } from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

type Props = {
  /** 비어 있으면 모든 유형을 보입니다. */
  types: readonly string[];
  onTypesChange: (types: string[]) => void;
  /** 비어 있으면 라벨로 거르지 않습니다. */
  labels: readonly string[];
  /** 라벨 메뉴에 보일 선택지입니다. labelChoices로 만듭니다. */
  labelChoices: readonly string[];
  onLabelsChange: (labels: string[]) => void;
  search: string;
  onSearchChange: (search: string) => void;
  dates: IssueDateFilter;
  onDatesChange: (dates: IssueDateFilter) => void;
};

const DATE_FIELDS: IssueDateField[] = ["created", "closed"];

/** 고른 보기 탭 안에서 유형, 라벨, 날짜, 검색어로 결과를 좁힙니다. */
export function IssueFilterBar({
  types,
  onTypesChange,
  labels,
  labelChoices,
  onLabelsChange,
  search,
  onSearchChange,
  dates,
  onDatesChange,
}: Props) {
  const messages = useMessages();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <CheckboxMenu
        label={messages.issue.type}
        summary={
          types.length === 0 ? messages.issues.allTypes : messages.issues.typeCount(types.length)
        }
        options={ISSUE_TYPES.map((type) => ({
          value: type,
          label: typeLabel(messages, type),
          tone: typeTone(type),
        }))}
        selected={types}
        onChange={onTypesChange}
      />

      <CheckboxMenu
        label={messages.issue.labels}
        summary={
          labels.length === 0
            ? messages.issues.allLabels
            : messages.issues.labelCount(labels.length)
        }
        options={labelChoices.map((label) =>
          label === NO_LABEL
            ? { value: label, label: messages.issues.noLabel, tone: "tone-none" }
            : { value: label, label, tone: nameTone(label) },
        )}
        selected={labels}
        onChange={onLabelsChange}
      />

      <fieldset
        aria-label={messages.issues.dates}
        className="flex min-w-0 flex-wrap items-center gap-1.5"
      >
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

      <SearchField
        label={messages.issues.search}
        placeholder={messages.issues.searchPlaceholder}
        value={search}
        onChange={onSearchChange}
        className="ml-auto w-64 max-w-full"
      />
    </div>
  );
}
