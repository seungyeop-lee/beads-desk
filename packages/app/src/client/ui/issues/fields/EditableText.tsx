import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { focusOnMount, useInlineEdit } from "./useInlineEdit";

type Props = {
  label: string;
  value: string;
  placeholder: string;
  /** true이면 빈 값으로 저장하지 않습니다. */
  required?: boolean;
  className?: string;
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
  onSave,
}: Props) {
  const { shown, draft, saving, edit, change, cancel, save } = useInlineEdit(
    value,
    onSave,
    required,
  );
  const messages = useMessages();

  if (draft === null) {
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
        className="input input-sm grow"
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
      <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
        {messages.common.save}
      </button>
      <button type="button" className="btn btn-sm btn-ghost" disabled={saving} onClick={cancel}>
        {messages.common.cancel}
      </button>
    </form>
  );
}
