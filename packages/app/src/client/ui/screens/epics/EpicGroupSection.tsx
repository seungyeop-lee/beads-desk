import type { ReactNode } from "react";
import type { EpicGroupKind } from "@/client/modules/epics/domain/epicGroups";
import { statusTone } from "@/client/ui/issues/issueLabels";
import { ChevronRightIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/** 이슈 화면의 상태 묶음과 같은 모양으로 묶음 머리를 보이고, 펼쳤을 때만 에픽 카드를 보입니다. */
export function EpicGroupSection({
  kind,
  count,
  expanded,
  onToggle,
  children,
}: {
  kind: EpicGroupKind;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const messages = useMessages();
  const label = messages.epics.groups[kind];
  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <h2 className="px-1">
        <button
          type="button"
          className="flex items-baseline gap-2 text-body font-bold"
          aria-expanded={expanded}
          aria-label={messages.epics.toggleGroup(label, expanded)}
          onClick={onToggle}
        >
          <ChevronRightIcon
            width={14}
            height={14}
            className={`self-center text-emphasis-50 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <span className={`tone-dot ${statusTone(kind)} self-center`} />
          {label}
          <span className="font-mono text-xs font-normal text-emphasis-50">{count}</span>
        </button>
      </h2>
      {expanded && children}
    </section>
  );
}
