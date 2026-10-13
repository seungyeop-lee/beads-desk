import { useState } from "react";
import { CloseIcon, PlusIcon } from "@/client/ui/designSystem/icons";
import { nameTone } from "../issueLabels";

type Props = {
  labels: string[];
  disabled: boolean;
  /** 성공하면 true를 돌려줍니다. */
  onAdd: (label: string) => Promise<boolean>;
  onRemove: (label: string) => void;
};

export function LabelEditor({ labels, disabled, onAdd, onRemove }: Props) {
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col gap-2">
      {labels.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <li key={label} className={`chip gap-1 pr-1 ${nameTone(label)}`}>
              {label}
              <button
                type="button"
                className="grid size-4 cursor-pointer place-items-center rounded-full opacity-50 hover:bg-base-content/10 hover:opacity-100"
                aria-label={`${label} 라벨 지우기`}
                disabled={disabled}
                onClick={() => onRemove(label)}
              >
                <CloseIcon width={11} height={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex items-center gap-1.5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (draft.trim() && (await onAdd(draft))) setDraft("");
        }}
      >
        <input
          className="input input-sm grow"
          aria-label="추가할 라벨"
          placeholder="라벨"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="btn btn-sm btn-square btn-ghost"
          aria-label="라벨 추가"
          disabled={disabled}
        >
          <PlusIcon width={15} height={15} />
        </button>
      </form>
    </div>
  );
}
