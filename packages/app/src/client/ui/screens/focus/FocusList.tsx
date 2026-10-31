import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FOCUS_LIST_LIMIT } from "@/client/modules/focus/domain/focusView";
import type { WorkState } from "@/client/modules/issues/domain/workState";
import { issueViewHref } from "@/client/ui/address/issueListAddress";
import { useWorkspaceHref } from "@/client/ui/address/workspaceAddress";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { GroupHeading } from "@/client/ui/designSystem/GroupHeading";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * 지금 화면의 모든 목록이 따르는 길이 규칙입니다. 앞의 FOCUS_LIST_LIMIT개만 보이고, 더 있으면 action에 다음 중 하나를 담습니다.
 * seeAllView를 주면 이슈 목록의 그 보기 탭으로 가는 링크를, 주지 않으면 그 자리에서 나머지를 펼치고 접는 버튼을 담습니다.
 */
export function useListLimit<T>(
  items: readonly T[],
  seeAllView?: WorkState,
): { shown: readonly T[]; action: ReactNode } {
  const messages = useMessages();
  const workspaceHref = useWorkspaceHref();
  const [expanded, setExpanded] = useState(false);
  const text = messages.focus.list;
  if (items.length <= FOCUS_LIST_LIMIT) return { shown: items, action: null };
  if (seeAllView) {
    return {
      shown: items.slice(0, FOCUS_LIST_LIMIT),
      action: (
        <Link
          href={workspaceHref(issueViewHref(seeAllView))}
          className="text-xs font-medium hover:underline"
        >
          {text.seeAll(items.length)} →
        </Link>
      ),
    };
  }
  return {
    shown: expanded ? items : items.slice(0, FOCUS_LIST_LIMIT),
    action: (
      <button
        type="button"
        className="text-xs font-medium hover:underline"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? text.showFewer : text.seeAll(items.length)}
      </button>
    ),
  };
}

/**
 * 두 열의 높이가 데이터 양과 관계없이 맞도록 목록 칸의 높이를 정하는 방식입니다. 칸에 다 들어가지 않으면 칸 안에서 스크롤합니다.
 * - fixed: 한 줄짜리 행 다섯 개만큼의 높이로 고정합니다. 비어 있어도 이 높이를 차지합니다.
 * - fill: 열의 남은 높이를 같은 열의 다른 fill 구역과 똑같이 나눠 갖습니다. 열 높이는 상대 열이 정합니다(FocusScreen의 Zone).
 * 두 열이 한 열로 쌓이는 좁은 창에서는 높이를 고정하지 않고 최대 높이만 둡니다.
 */
export type ListBox = "fixed" | "fill";

const LIST_BOX_CLASSES: Record<ListBox, { section: string; box: string }> = {
  fixed: { section: "", box: "max-h-96 overflow-y-auto lg:h-57 lg:max-h-none" },
  fill: {
    section: "lg:min-h-0 lg:flex-1",
    box: "max-h-96 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1",
  },
};

/** 구역과 목록 칸에 붙일 높이 class입니다. box가 없으면 내용만큼 자랍니다. */
export function listBoxClasses(box: ListBox | undefined): { section: string; box: string } {
  return box ? LIST_BOX_CLASSES[box] : { section: "", box: "" };
}

type FocusListSectionProps<T> = {
  title: string;
  /** 제목 앞 점의 색입니다. 없으면 점을 그리지 않습니다. */
  tone?: string;
  empty: string;
  items: readonly T[];
  /** 이슈 목록에 같은 보기 탭이 있는 목록이면 그 탭입니다. */
  seeAllView?: WorkState;
  /** 제목 아래에 두는 설명입니다. */
  note?: ReactNode;
  box?: ListBox;
  renderItem: (item: T) => ReactNode;
};

/** 제목에 전체 개수를 붙이고, useListLimit의 규칙으로 앞부분만 보이는 목록 구역입니다. */
export function FocusListSection<T>({
  title,
  tone,
  empty,
  items,
  seeAllView,
  note,
  box,
  renderItem,
}: FocusListSectionProps<T>) {
  const { shown, action } = useListLimit(items, seeAllView);
  const classes = listBoxClasses(box);
  return (
    <section aria-label={title} className={`flex flex-col gap-2 ${classes.section}`}>
      <GroupHeading title={title} tone={tone} count={items.length}>
        <span className="ml-auto font-normal">{action}</span>
      </GroupHeading>
      {note}
      {items.length === 0 ? (
        <EmptyState
          message={empty}
          variant="compact"
          className={`flex items-center justify-center ${classes.box}`}
        />
      ) : (
        <ul
          className={`surface flex flex-col divide-y divide-base-300 ${box ? "focus-scroll-shadow" : ""} ${classes.box}`}
        >
          {shown.map(renderItem)}
        </ul>
      )}
    </section>
  );
}
