import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { createIssueAction } from "@/server/web/issues/issueActions";
import { PRIORITIES, priorityLabel, TYPE_LABELS } from "./issueLabels";

type Props = {
  onCreated: (issueId: string) => void;
  onClose: () => void;
};

/** Ctrl/Cmd+Enter로도 만듭니다. */
export function NewIssueDialog({ onCreated, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { run, pending, error } = useIssueWrites();
  const [title, setTitle] = useState("");
  const [issueType, setIssueType] = useState("");
  const [priority, setPriority] = useState(2);
  const [labels, setLabels] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const submit = async (event?: FormEvent | KeyboardEvent) => {
    event?.preventDefault();
    if (pending || title.trim().length === 0) return;
    const result = await run(() =>
      createIssueAction({
        title,
        issueType: issueType || null,
        priority,
        description,
        labels: labels.split(","),
      }),
    );
    if (result.ok) onCreated(result.data);
  };

  const submitOnModEnter = (event: KeyboardEvent) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit(event);
  };

  return (
    <dialog ref={dialogRef} className="modal" aria-label="새 이슈" onClose={onClose}>
      <form className="modal-box flex max-w-2xl flex-col gap-3" onSubmit={submit}>
        <h2 className="text-lg font-bold">새 이슈</h2>
        {error && (
          <div role="alert" className="alert alert-error alert-soft">
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}
        <label className="floating-label">
          <span>제목</span>
          <input
            ref={(input) => input?.focus()}
            className="input w-full"
            placeholder="제목"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={submitOnModEnter}
          />
        </label>
        <div className="flex gap-3">
          <label className="floating-label grow">
            <span>유형</span>
            <select
              className="select w-full"
              value={issueType}
              onChange={(event) => setIssueType(event.target.value)}
            >
              <option value="">기본값</option>
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="floating-label grow">
            <span>우선순위</span>
            <select
              className="select w-full"
              value={priority}
              onChange={(event) => setPriority(Number(event.target.value))}
            >
              {PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  P{option} {priorityLabel(option)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="floating-label">
          <span>라벨</span>
          <input
            className="input w-full"
            placeholder="라벨 (쉼표로 구분)"
            value={labels}
            onChange={(event) => setLabels(event.target.value)}
            onKeyDown={submitOnModEnter}
          />
        </label>
        <label className="floating-label">
          <span>설명</span>
          <textarea
            className="textarea field-sizing-content min-h-32 w-full font-mono text-sm"
            placeholder="설명 (markdown)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={submitOnModEnter}
          />
        </label>
        <div className="modal-action mt-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => dialogRef.current?.close()}
          >
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || !title.trim()}>
            {pending && <span className="loading loading-spinner loading-xs" />}
            만들기
          </button>
        </div>
      </form>
    </dialog>
  );
}
