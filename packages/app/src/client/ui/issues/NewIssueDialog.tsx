import { Spinner } from "@/client/ui/designSystem/Spinner";
import type { Issue } from "@beads-desk/bd/issue";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { epicsFirst } from "@/client/modules/issues/domain/issuePicker";
import { ISSUE_TYPES } from "@/client/modules/issues/domain/issueTypes";
import { tabMarkdownUrl } from "@/client/modules/markdown/application/markdownAddress";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ModalBackdrop, useShowModal } from "@/client/ui/designSystem/modal";
import { MarkdownEditor } from "@/client/ui/markdown/MarkdownEditor";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { PRIORITIES, type NewIssueInput } from "@/shared/contract/issueActions";
import { IssuePicker } from "./IssuePicker";
import { priorityLabel, typeLabel, typeTone } from "./issueLabels";
import { CopyIssueIdButton } from "./CopyIssueIdButton";

type Props = {
  /** 폼을 채운 입력으로 새 이슈 만들기를 실행합니다. 성공하면 부르는 쪽이 대화상자를 닫고 만든 이슈로 이동합니다. */
  create: (input: NewIssueInput) => Promise<boolean>;
  /** 만들기가 진행 중이면 제출을 막습니다. */
  pending: boolean;
  /** 만들기가 실패한 오류 문구입니다. */
  error: string | null;
  onClose: () => void;
  /** 에픽 화면처럼 상위 이슈를 정해 두고 열 때 넘깁니다. 이렇게 연 대화상자에서는 상위 이슈를 바꾸거나 지울 수 없습니다. */
  fixedParent?: Issue;
};

/** Ctrl/Cmd+Enter로도 만듭니다. */
export function NewIssueDialog({ create, pending, error, onClose, fixedParent }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // dialog 안의 요소 순서와 관계없이 제목 입력이 먼저 focus를 받습니다.
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [issueType, setIssueType] = useState("");
  const [priority, setPriority] = useState(2);
  const [labels, setLabels] = useState("");
  const [description, setDescription] = useState("");
  const [pickedParent, setPickedParent] = useState<Issue | null>(null);
  const parent = fixedParent ?? pickedParent;
  const messages = useMessages();

  useShowModal(dialogRef, true, titleRef);

  const submit = async (event?: FormEvent | KeyboardEvent) => {
    event?.preventDefault();
    if (pending || title.trim().length === 0) return;
    await create({
      title,
      issueType: issueType || null,
      priority,
      description,
      labels: labels.split(","),
      parent: parent?.id ?? null,
    });
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
          {error && <ErrorAlert multiline>{error}</ErrorAlert>}
          <label className="flex flex-col gap-1.5">
            <span className="caption">{messages.issue.title}</span>
            <input
              ref={titleRef}
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
          <div className="flex flex-col gap-1.5">
            <span className="caption">{messages.newIssue.parent}</span>
            {parent ? (
              <span className="flex h-10 items-center gap-2 rounded-field border border-base-300 px-3 text-sm">
                <span className={`tone-dot ${typeTone(parent.issueType)}`} />
                <CopyIssueIdButton
                  issueId={parent.id}
                  className="rounded text-xs text-emphasis-60"
                />
                <span className="min-w-0 grow truncate">{parent.title}</span>
                {!fixedParent && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label={messages.newIssue.clearParent}
                    onClick={() => setPickedParent(null)}
                  >
                    <CloseIcon width={13} height={13} />
                  </button>
                )}
              </span>
            ) : (
              <IssuePicker
                label={messages.newIssue.parentSearch}
                rank={epicsFirst}
                onPick={async (issue) => {
                  setPickedParent(issue);
                  return true;
                }}
              />
            )}
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
          <div className="flex flex-col gap-1.5">
            <span className="caption">{messages.issue.bodyFields.description}</span>
            <div className="textarea h-auto min-h-32 w-full text-sm">
              <MarkdownEditor
                value=""
                openAddress={tabMarkdownUrl}
                label={messages.issue.bodyFields.description}
                placeholder={messages.newIssue.descriptionPlaceholder}
                onChange={setDescription}
                onSubmit={() => void submit()}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-base-300 bg-base-200/50 px-7 py-4">
          <span className="text-xs text-emphasis-40">{messages.newIssue.submitHint}</span>
          <button
            type="button"
            className="btn btn-ghost ml-auto"
            onClick={() => dialogRef.current?.close()}
          >
            {messages.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || !title.trim()}>
            {pending && <Spinner />}
            {messages.newIssue.create}
          </button>
        </div>
      </form>
      <ModalBackdrop />
    </dialog>
  );
}
