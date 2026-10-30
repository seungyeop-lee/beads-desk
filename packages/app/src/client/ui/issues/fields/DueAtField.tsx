import { useId, useState, type KeyboardEvent } from "react";
import {
  dueAtFromInput,
  dueAtInputOf,
  type DueAtInput,
} from "@/client/modules/issues/domain/issueDueAt";
import { localDayOf } from "@/client/modules/issues/domain/issueDateFilter";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { dueAtLabel } from "../issueTime";
import { focusOnMount } from "./useInlineEdit";
import { useSavedValue } from "./useSavedValue";

type Props = {
  /** 저장된 마감 시각(epoch ms)입니다. 마감일이 없으면 null입니다. */
  value: number | null;
  /** UTC 시각(toISOString 형식)을 받고, 빈 문자열이면 마감일을 지웁니다. 저장에 성공하면 true를 돌려줍니다. */
  onSave: (dueAt: string) => Promise<boolean>;
};

/** 누르면 날짜와 시각 입력으로 바뀌는 마감일입니다. 날짜는 꼭 고르고 시각은 비워 둘 수 있습니다. Escape로 취소합니다. */
export function DueAtField({ value, onSave }: Props) {
  const [shown, showSaved] = useSavedValue(value);
  const [draft, setDraft] = useState<DueAtInput | null>(null);
  const [saving, setSaving] = useState(false);
  const timeHintId = useId();
  const locale = useLocale();
  const messages = useMessages();

  const save = async (dueAt: string) => {
    setSaving(true);
    const saved = await onSave(dueAt);
    setSaving(false);
    if (saved) {
      showSaved(dueAt === "" ? null : Date.parse(dueAt));
      setDraft(null);
    }
  };

  const cancelOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(null);
    }
  };

  if (draft === null) {
    return (
      <button
        type="button"
        title={messages.editable.editField(messages.issue.dueAt)}
        className="-mx-1.5 cursor-text rounded-md px-1.5 text-left tabular-nums hover:bg-base-content/6"
        onClick={() =>
          setDraft(shown === null ? { day: localDayOf(Date.now()), time: "" } : dueAtInputOf(shown))
        }
      >
        {shown === null ? (
          <span className="text-emphasis-50">{messages.common.none}</span>
        ) : (
          dueAtLabel(locale, shown)
        )}
      </button>
    );
  }
  return (
    <form
      aria-label={messages.issue.dueAt}
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        // 고치지 않고 저장하면 초 단위까지 있던 마감 시각이 분 단위로 바뀌지 않도록 그대로 둡니다.
        const before = shown === null ? null : dueAtInputOf(shown);
        if (before?.day === draft.day && before.time === draft.time) setDraft(null);
        else void save(dueAtFromInput(draft));
      }}
    >
      <span className="flex flex-wrap gap-1.5">
        <input
          ref={focusOnMount}
          type="date"
          required
          className="input input-sm min-w-0 grow basis-32"
          aria-label={messages.dueAt.date}
          value={draft.day}
          disabled={saving}
          onKeyDown={cancelOnEscape}
          onChange={(event) => setDraft({ ...draft, day: event.target.value })}
        />
        <input
          type="time"
          className="input input-sm min-w-0 grow basis-24"
          aria-label={messages.dueAt.time}
          aria-describedby={timeHintId}
          value={draft.time}
          disabled={saving}
          onKeyDown={cancelOnEscape}
          onChange={(event) => setDraft({ ...draft, time: event.target.value })}
        />
      </span>
      <span id={timeHintId} className="text-xs text-emphasis-60">
        {messages.dueAt.timeHint}
      </span>
      <span className="flex flex-wrap gap-1">
        <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
          {messages.common.save}
        </button>
        {shown !== null && (
          <button
            type="button"
            className="btn btn-sm"
            disabled={saving}
            onClick={() => void save("")}
          >
            {messages.dueAt.clear}
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={saving}
          onClick={() => setDraft(null)}
        >
          {messages.common.cancel}
        </button>
      </span>
    </form>
  );
}
