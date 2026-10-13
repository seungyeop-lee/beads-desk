import { useState } from "react";
import { Markdown } from "@/client/ui/designSystem/Markdown";
import { useSavedValue } from "./useSavedValue";

type Props = {
  label: string;
  value: string;
  /** 저장에 성공하면 true를 돌려줍니다. */
  onSave: (value: string) => Promise<boolean>;
};

/** markdown으로 보여 주다가 편집을 누르면 textarea로 바뀌는 본문입니다. Ctrl/Cmd+Enter로 저장하고 Escape로 취소합니다. */
export function EditableMarkdown({ label, value, onSave }: Props) {
  const [shown, showSaved] = useSavedValue(value);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft === null || saving) return;
    if (draft === shown) return setDraft(null);
    setSaving(true);
    const saved = await onSave(draft);
    setSaving(false);
    if (saved) {
      showSaved(draft);
      setDraft(null);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{label}</h3>
        {draft === null && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setDraft(shown)}>
            편집
          </button>
        )}
      </div>
      {draft === null ? (
        shown ? (
          <Markdown text={shown} />
        ) : (
          <p className="text-sm text-base-content/50">비어 있음</p>
        )
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <textarea
            ref={(textarea) => textarea?.focus()}
            className="textarea field-sizing-content min-h-32 w-full font-mono text-sm"
            aria-label={label}
            value={draft}
            disabled={saving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void save();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setDraft(null);
              }
            }}
          />
          <div className="flex gap-2">
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
          </div>
        </form>
      )}
    </section>
  );
}
