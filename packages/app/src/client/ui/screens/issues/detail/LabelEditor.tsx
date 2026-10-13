import { useState } from "react";

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
        <ul className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <li key={label} className="badge badge-outline gap-1">
              {label}
              <button
                type="button"
                className="cursor-pointer opacity-60 hover:opacity-100"
                aria-label={`${label} 라벨 지우기`}
                disabled={disabled}
                onClick={() => onRemove(label)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="join"
        onSubmit={async (event) => {
          event.preventDefault();
          if (draft.trim() && (await onAdd(draft))) setDraft("");
        }}
      >
        <input
          className="input input-xs join-item w-full"
          aria-label="추가할 라벨"
          placeholder="라벨"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="btn btn-xs join-item" disabled={disabled}>
          추가
        </button>
      </form>
    </div>
  );
}
