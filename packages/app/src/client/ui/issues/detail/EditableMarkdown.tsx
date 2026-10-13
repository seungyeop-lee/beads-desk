import { Markdown } from "@/client/ui/designSystem/Markdown";
import { focusOnMount, useInlineEdit } from "../fields/useInlineEdit";

type Props = {
  label: string;
  value: string;
  /** 저장에 성공하면 true를 돌려줍니다. */
  onSave: (value: string) => Promise<boolean>;
};

/** markdown으로 보여 주다가 편집을 누르면 textarea로 바뀌는 본문입니다. Ctrl/Cmd+Enter로 저장하고 Escape로 취소합니다. */
export function EditableMarkdown({ label, value, onSave }: Props) {
  const { shown, draft, saving, edit, change, cancel, save } = useInlineEdit(value, onSave);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{label}</h3>
        {draft === null && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={edit}>
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
            ref={focusOnMount}
            className="textarea field-sizing-content min-h-32 w-full font-mono text-sm"
            aria-label={label}
            value={draft}
            disabled={saving}
            onChange={(event) => change(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void save();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancel();
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
              onClick={cancel}
            >
              취소
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
