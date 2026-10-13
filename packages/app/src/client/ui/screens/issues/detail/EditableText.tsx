import { useState } from "react";
import { useSavedValue } from "./useSavedValue";

// 렌더링마다 새로 만든 ref 함수는 커밋할 때마다 다시 호출되어, 사용자가 다른 칸으로 옮긴 포커스를 되찾아 옵니다.
// module 수준 함수를 넘겨 입력란이 나타날 때 한 번만 포커스를 줍니다.
const focusOnMount = (element: HTMLElement | null) => element?.focus();

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
  const [shown, showSaved] = useSavedValue(value);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft === null || saving) return;
    if (draft === shown) return setDraft(null);
    if (required && draft.trim().length === 0) return;
    setSaving(true);
    const saved = await onSave(draft);
    setSaving(false);
    if (saved) {
      showSaved(draft);
      setDraft(null);
    }
  };

  if (draft === null) {
    return (
      <button
        type="button"
        title={`${label} 고치기`}
        className={`-mx-1 cursor-text rounded px-1 text-left hover:bg-base-200 ${className}`}
        onClick={() => setDraft(shown)}
      >
        {shown || <span className="text-base-content/50">{placeholder}</span>}
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-2"
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
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(null);
          }
        }}
      />
      <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
        저장
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        disabled={saving}
        onClick={() => setDraft(null)}
      >
        취소
      </button>
    </form>
  );
}
