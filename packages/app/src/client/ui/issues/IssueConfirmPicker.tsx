import type { Issue } from "@beads-desk/bd/issue";
import { useState } from "react";
import type { PickerOptions } from "@/client/modules/issues/domain/issuePicker";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { IssuePicker } from "./IssuePicker";
import { typeTone } from "./issueLabels";
import { CopyIssueIdButton } from "./CopyIssueIdButton";

type Props = PickerOptions & {
  label: string;
  /** 검색창의 안내 문구입니다. 주지 않으면 공통 문구를 씁니다. */
  placeholder?: string;
  /** 확인 버튼에 표시할 동작 문구입니다. */
  confirmLabel: string;
  disabled?: boolean;
  /** 확인을 눌렀을 때 실행할 등록입니다. 성공하면 true를 돌려줍니다. 그때만 선택을 지웁니다. */
  onConfirm: (issue: Issue) => Promise<boolean>;
};

/** IssuePicker로 고른 이슈를 표시 줄로 보여 주고, 확인을 누를 때만 등록을 실행합니다. */
export function IssueConfirmPicker({
  label,
  placeholder,
  confirmLabel,
  disabled,
  onConfirm,
  exclude,
  rank,
}: Props) {
  const messages = useMessages();
  const [picked, setPicked] = useState<Issue | null>(null);
  const [confirming, setConfirming] = useState(false);

  const confirm = async () => {
    if (!picked || confirming) return;
    setConfirming(true);
    try {
      if (await onConfirm(picked)) setPicked(null);
    } finally {
      setConfirming(false);
    }
  };

  if (!picked) {
    return (
      <IssuePicker
        label={label}
        placeholder={placeholder}
        disabled={disabled}
        exclude={exclude}
        rank={rank}
        onPick={async (issue) => {
          setPicked(issue);
          return true;
        }}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 min-w-0 grow items-center gap-2 rounded-field border border-base-300 bg-base-100 px-3 text-sm">
        <span className={`tone-dot ${typeTone(picked.issueType)}`} />
        <CopyIssueIdButton
          issueId={picked.id}
          className="shrink-0 rounded text-xs text-base-content/55"
        />
        <span className="min-w-0 grow truncate">{picked.title}</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          aria-label={messages.issuePicker.clearSelection}
          disabled={confirming}
          onClick={() => setPicked(null)}
        >
          <CloseIcon width={13} height={13} />
        </button>
      </span>
      <button
        type="button"
        className="btn btn-sm btn-ghost shrink-0 rounded-full"
        // Enter로 후보를 고른 뒤에도 이어서 Enter로 확인할 수 있게 포커스를 옮겨 둡니다.
        // dialog 안이 아니라 규칙 예외에 들지 못해 주석으로 허용합니다.
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        disabled={confirming}
        onClick={() => void confirm()}
      >
        {confirming && <span className="loading loading-spinner loading-xs" />}
        {confirmLabel}
      </button>
    </div>
  );
}
