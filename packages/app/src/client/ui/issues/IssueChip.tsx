import type { HTMLAttributes } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { nameTone, priorityLabel, priorityTone, statusLabel, statusTone } from "./issueLabels";

type IssueChipProps = HTMLAttributes<HTMLSpanElement> & {
  /** 칩의 색입니다. 주지 않으면 색 없이 보입니다. */
  tone?: string;
  size?: "sm" | "md";
};

/** 이슈의 상태, 우선순위, 라벨을 보이는 칩의 공통 모양입니다. 규격이 한 곳에서 유지되므로 화면마다 어긋나지 않습니다. */
export function IssueChip({
  tone = "",
  size = "sm",
  className = "",
  children,
  ...rest
}: IssueChipProps) {
  return (
    <span
      className={`chip ${size === "sm" ? "h-5 px-2 text-[11px]" : ""} ${tone} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

/** 우선순위를 P{번호} {이름}으로 보입니다. */
export function PriorityChip({ priority }: { priority: number }) {
  const messages = useMessages();
  return (
    <IssueChip tone={priorityTone(priority)}>
      P{priority} {priorityLabel(messages, priority)}
    </IssueChip>
  );
}

/** 상태를 보입니다. 목록에 없는 상태는 원래 이름 그대로 보입니다. */
export function StatusChip({
  status,
  size,
  className,
}: {
  status: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const messages = useMessages();
  return (
    <IssueChip tone={statusTone(status)} size={size} className={className}>
      {statusLabel(messages, status)}
    </IssueChip>
  );
}

/** 라벨을 보입니다. 같은 라벨은 어디서나 같은 색으로 보입니다. */
export function LabelChip({ label, className }: { label: string; className?: string }) {
  return (
    <IssueChip tone={nameTone(label)} className={className}>
      {label}
    </IssueChip>
  );
}
