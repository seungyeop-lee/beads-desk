import type { ReactNode } from "react";
import { CheckIcon, CloseIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { focusOnMount, useInlineEdit } from "./useInlineEdit";

type Props = {
  label: string;
  value: string;
  placeholder: string;
  /** true이면 빈 값으로 저장하지 않습니다. */
  required?: boolean;
  className?: string;
  /** 표 안처럼 좁은 곳에 둘 때 입력란과 버튼을 작게 그립니다. */
  compact?: boolean;
  /** 값을 기본 버튼 대신 직접 그립니다. edit를 호출하면 입력란으로 바뀝니다. */
  renderValue?: (shown: string, edit: () => void) => ReactNode;
  /** 저장에 성공하면 true를 돌려줍니다. */
  onSave: (value: string) => Promise<boolean>;
};

/** 누르면 한 줄 입력으로 바뀌는 글자입니다. Enter로 저장하고 Escape로 취소합니다. */
export function EditableText({
  label,
  value,
  placeholder,
  required,
  className = "",
  compact = false,
  renderValue,
  onSave,
}: Props) {
  const { shown, draft, saving, edit, change, cancel, save } = useInlineEdit(
    value,
    onSave,
    required,
  );
  const messages = useMessages();

  if (draft === null) {
    if (renderValue) return renderValue(shown, edit);
    return (
      <button
        type="button"
        title={messages.editable.editField(label)}
        className={`-mx-1.5 cursor-text rounded-md px-1.5 text-left hover:bg-base-content/6 ${className}`}
        onClick={edit}
      >
        {shown || <span className="text-base-content/50">{placeholder}</span>}
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <input
        ref={focusOnMount}
        className={`input ${compact ? "input-xs" : "input-sm"} grow`}
        aria-label={label}
        value={draft}
        disabled={saving}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
      />
      {compact ? (
        <>
          <button
            type="submit"
            className="btn btn-xs btn-square btn-primary"
            aria-label={messages.common.save}
            disabled={saving}
          >
            <CheckIcon width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-xs btn-square btn-ghost"
            aria-label={messages.common.cancel}
            disabled={saving}
            onClick={cancel}
          >
            <CloseIcon width={14} height={14} />
          </button>
        </>
      ) : (
        <>
          <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
            {messages.common.save}
          </button>
          <button type="button" className="btn btn-sm btn-ghost" disabled={saving} onClick={cancel}>
            {messages.common.cancel}
          </button>
        </>
      )}
    </form>
  );
}
