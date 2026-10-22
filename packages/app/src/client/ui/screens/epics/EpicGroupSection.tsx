import { GroupHeading } from "@/client/ui/designSystem/GroupHeading";
import type { ReactNode } from "react";
import type { EpicGroupKind } from "@/client/modules/epics/domain/epicGroups";
import { statusTone } from "@/client/ui/issues/issueLabels";
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
      <GroupHeading
        title={label}
        count={count}
        tone={statusTone(kind)}
        disclosure={{ expanded, label: messages.epics.toggleGroup(label, expanded), onToggle }}
      />
      {expanded && children}
    </section>
  );
}
