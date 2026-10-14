import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { createIssueAction } from "@/server/web/issues/issueActions";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { ISSUE_TYPES, PRIORITIES, priorityLabel, typeLabel } from "./issueLabels";

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
  const messages = useMessages();

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
    <dialog
      ref={dialogRef}
      className="modal"
      aria-label={messages.newIssue.title}
      onClose={onClose}
    >
      <form className="modal-box flex max-w-2xl flex-col gap-0 p-0" onSubmit={submit}>
        <div className="flex flex-col gap-5 px-7 pt-7 pb-6">
          <h2 className="text-xl font-bold tracking-tight">{messages.newIssue.title}</h2>
          {error && (
            <div role="alert" className="alert alert-error alert-soft">
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="caption">{messages.issue.title}</span>
            <input
              autoFocus
              className="input w-full text-base"
              placeholder={messages.newIssue.titlePlaceholder}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={submitOnModEnter}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="caption">{messages.issue.type}</span>
              <select
                className="select w-full"
                value={issueType}
                onChange={(event) => setIssueType(event.target.value)}
              >
                <option value="">{messages.newIssue.defaultType}</option>
                {ISSUE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(messages, type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="caption">{messages.issue.priority}</span>
              <select
                className="select w-full"
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value))}
              >
                {PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    P{option} {priorityLabel(messages, option)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="caption">{messages.issue.labels}</span>
            <input
              className="input w-full"
              placeholder={messages.newIssue.labelsPlaceholder}
              value={labels}
              onChange={(event) => setLabels(event.target.value)}
              onKeyDown={submitOnModEnter}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="caption">{messages.issue.bodyFields.description}</span>
            <textarea
              className="textarea field-sizing-content min-h-32 w-full font-mono text-sm"
              placeholder={messages.newIssue.descriptionPlaceholder}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onKeyDown={submitOnModEnter}
            />
          </label>
        </div>
        <div className="flex items-center gap-2 border-t border-base-300 bg-base-200/50 px-7 py-4">
          <span className="text-xs text-base-content/40">{messages.newIssue.submitHint}</span>
          <button
            type="button"
            className="btn btn-ghost ml-auto"
            onClick={() => dialogRef.current?.close()}
          >
            {messages.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || !title.trim()}>
            {pending && <span className="loading loading-spinner loading-xs" />}
            {messages.newIssue.create}
          </button>
        </div>
      </form>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">{messages.common.close}</button>
      </form>
    </dialog>
  );
}
