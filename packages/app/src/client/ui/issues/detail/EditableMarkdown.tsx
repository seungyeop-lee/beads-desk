import { PencilIcon, PlusIcon } from "@/client/ui/designSystem/icons";
import { keepUnchangedBlocks } from "@/client/modules/markdown/domain/keepUnchangedBlocks";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { useInlineEdit } from "../fields/useInlineEdit";

type Props = {
  label: string;
  value: string;
  /** 저장에 성공하면 true를 돌려줍니다. */
  onSave: (value: string) => Promise<boolean>;
};

/**
 * 읽기 전용 markdown 편집기로 보여 주다가 편집을 누르면 같은 편집기로 고칩니다. Ctrl/Cmd+Enter로 저장합니다.
 * 저장하는 값은 고치지 않은 블록의 원문 글자를 그대로 둡니다.
 * 비어 있으면 작은 추가 단추만 보이므로, 부모가 flex-wrap으로 늘어놓으면 빈 본문들의 단추가 한 줄에 모입니다.
 */
export function EditableMarkdown({ label, value, onSave }: Props) {
  const { shown, draft, saving, edit, change, cancel, save } = useInlineEdit(value, onSave);
  const messages = useMessages();

  if (draft === null && !shown) {
    return (
      <button
        type="button"
        className="btn btn-sm gap-1.5 rounded-full border-dashed border-base-300 bg-transparent font-medium text-base-content/55 shadow-none hover:border-base-content/30 hover:text-base-content"
        aria-label={messages.editable.addField(label)}
        onClick={edit}
      >
        <PlusIcon width={14} height={14} />
        {label}
      </button>
    );
  }

  return (
    <section aria-label={label} className="group flex w-full flex-col gap-2">
      <div className="flex h-6 items-center gap-2">
        <h3 className="caption">{label}</h3>
        {draft === null && (
          <button
            type="button"
            className="btn btn-ghost btn-xs gap-1 text-base-content/50 opacity-0 group-hover:opacity-100 focus:opacity-100"
            onClick={edit}
          >
            <PencilIcon width={12} height={12} />
            {messages.editable.edit}
          </button>
        )}
      </div>
      {draft === null ? (
        <MarkdownEditor readOnly value={shown} />
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="rounded-field border border-base-300 px-3 py-2 focus-within:border-base-content/40">
            <MarkdownEditor
              value={shown}
              label={label}
              focusOnCreate
              disabled={saving}
              onChange={(markdown) => change(keepUnchangedBlocks(shown, markdown))}
              onSubmit={() => void save()}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
              {messages.common.save}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={saving}
              onClick={cancel}
            >
              {messages.common.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
