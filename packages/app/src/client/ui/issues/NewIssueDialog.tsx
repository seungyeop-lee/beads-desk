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
      <form className="modal-box flex max-w-2xl flex-col gap-0 p-0" onSubmit={submit}>
        <div className="flex flex-col gap-5 px-7 pt-7 pb-6">
          <h2 className="text-xl font-bold tracking-tight">새 이슈</h2>
          {error && (
            <div role="alert" className="alert alert-error alert-soft">
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="caption">제목</span>
            <input
              autoFocus
              className="input w-full text-base"
              placeholder="무엇을 해야 하나요?"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={submitOnModEnter}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="caption">유형</span>
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
            <label className="flex flex-col gap-1.5">
              <span className="caption">우선순위</span>
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
          <label className="flex flex-col gap-1.5">
            <span className="caption">라벨</span>
            <input
              className="input w-full"
              placeholder="쉼표로 구분"
              value={labels}
              onChange={(event) => setLabels(event.target.value)}
              onKeyDown={submitOnModEnter}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="caption">설명</span>
            <textarea
              className="textarea field-sizing-content min-h-32 w-full font-mono text-sm"
              placeholder="markdown으로 씁니다"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onKeyDown={submitOnModEnter}
            />
          </label>
        </div>
        <div className="flex items-center gap-2 border-t border-base-300 bg-base-200/50 px-7 py-4">
          <span className="text-xs text-base-content/40">Ctrl/⌘ + Enter로 만들기</span>
          <button
            type="button"
            className="btn btn-ghost ml-auto"
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
      <form method="dialog" className="modal-backdrop">
        <button type="submit">닫기</button>
      </form>
    </dialog>
  );
}
