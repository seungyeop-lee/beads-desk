import type { Issue } from "@beads-desk/bd/issue";
import { useId, useState, type KeyboardEvent } from "react";
import { useIssueCandidates } from "@/client/modules/issues/application/useIssueCandidates";
import { pickerCandidates, type PickerOptions } from "@/client/modules/issues/domain/issuePicker";
import { SearchIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { statusLabel, statusTone, typeTone } from "./issueLabels";

type Props = PickerOptions & {
  label: string;
  /** 검색창의 안내 문구입니다. 주지 않으면 공통 문구를 씁니다. */
  placeholder?: string;
  disabled?: boolean;
  /** 성공하면 true를 돌려줍니다. 그때만 검색어를 비웁니다. */
  onPick: (issue: Issue) => Promise<boolean>;
};

/** 제목이나 id 일부로 이슈를 찾아 고릅니다. 후보는 입력을 처음 쓸 때 읽습니다. */
export function IssuePicker({ label, placeholder, disabled, onPick, exclude, rank }: Props) {
  const messages = useMessages();
  const listId = useId();
  const [touched, setTouched] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { data, error } = useIssueCandidates(touched);

  const matches = data ? pickerCandidates(data, query, { exclude, rank }) : [];
  const activeIssue = open ? matches[active] : undefined;
  const optionId = (issue: Issue) => `${listId}-${issue.id}`;

  const show = () => {
    setTouched(true);
    setOpen(true);
  };

  const pick = async (issue: Issue) => {
    setOpen(false);
    if (await onPick(issue)) setQuery("");
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return show();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + matches.length) % Math.max(matches.length, 1));
    } else if (event.key === "Enter" && activeIssue) {
      event.preventDefault();
      void pick(activeIssue);
    } else if (event.key === "Escape" && open) {
      // 후보 목록만 닫고, 입력을 감싼 dialog는 닫지 않습니다.
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <label className="input input-sm w-full">
        <SearchIcon width={14} height={14} className="text-base-content/40" />
        <input
          className="grow"
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeIssue ? optionId(activeIssue) : undefined}
          placeholder={placeholder ?? messages.issuePicker.placeholder}
          disabled={disabled}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            show();
          }}
          onFocus={show}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </label>
      {/* datalist와 select는 후보 줄에 유형, 상태 같은 내용을 그릴 수 없어 WAI-ARIA combobox 패턴의 listbox를 씁니다. */}
      <div
        id={listId}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="listbox"
        aria-label={label}
        hidden={!open}
        className="absolute inset-x-0 top-full z-30 mt-1 flex max-h-80 flex-col overflow-y-auto rounded-box border border-base-300 bg-base-100 p-1 shadow-lg"
      >
        {error ? (
          <p className="px-3 py-2 text-xs text-error">{messages.issues.loadFailed(error)}</p>
        ) : data === null ? (
          <span
            className="loading loading-spinner loading-xs m-2"
            aria-label={messages.common.loading}
          />
        ) : matches.length === 0 ? (
          <p className="px-3 py-2 text-xs text-base-content/50">{messages.issuePicker.empty}</p>
        ) : (
          matches.map((issue, index) => (
            <div
              key={issue.id}
              id={optionId(issue)}
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
              role="option"
              aria-selected={index === active}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${index === active ? "bg-base-200" : ""}`}
              // input의 blur보다 먼저 골라야 목록이 닫히기 전에 고를 수 있습니다.
              onPointerDown={(event) => {
                event.preventDefault();
                void pick(issue);
              }}
              onPointerEnter={() => setActive(index)}
            >
              <span className={`tone-dot ${typeTone(issue.issueType)}`} />
              <span className="shrink-0 font-mono text-xs text-base-content/55">{issue.id}</span>
              <span className="min-w-0 grow truncate">{issue.title}</span>
              <span className={`chip h-5 px-2 text-[11px] ${statusTone(issue.status)}`}>
                {statusLabel(messages, issue.status)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
