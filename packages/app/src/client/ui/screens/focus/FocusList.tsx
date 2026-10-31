import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FOCUS_LIST_LIMIT } from "@/client/modules/focus/domain/focusView";
import type { WorkState } from "@/client/modules/issues/domain/workState";
import { issueViewHref } from "@/client/ui/address/issueListAddress";
import { useWorkspaceHref } from "@/client/ui/address/workspaceAddress";
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
 * 두 열로 놓이는 목록 칸의 높이 규칙입니다. 넓은 창에서 칸은 내용만큼 자라되 한 줄짜리 행 한 개와 다섯 개 높이 사이에 머물고,
 * 넘치는 내용은 칸 안에서 스크롤합니다. 한 행의 높이는 두 열 가운데 더 긴 쪽이 정하고, 짧은 쪽 칸은 그 높이까지 늘어납니다.
 *
 * 칸의 max-height는 행 높이를 정할 때 내용의 몫을 다섯 줄로 줄이는 데만 쓰고, 늘어날 때는 막지 않아야 합니다.
 * 그래서 칸을 frame으로 감싸 frame이 열의 남은 높이를 채우게 하고, 칸은 min-height: 100%로 frame을 채웁니다.
 * min-height가 max-height보다 우선하고, 행 높이를 정하는 동안에는 frame 높이가 정해지지 않아 100%가 적용되지 않습니다.
 * 두 열이 한 열로 쌓이는 좁은 창에서는 칸이 내용만큼 자라고 최대 높이만 둡니다.
 */
const ROW_BOX_CLASSES = {
  section: "lg:grow",
  frame: "lg:flex lg:min-h-[calc(14.25rem/5)] lg:grow lg:flex-col",
  box: "max-h-96 overflow-y-auto lg:max-h-57 lg:min-h-full",
};

const FREE_BOX_CLASSES = { section: "", frame: "", box: "" };

/** 구역, 칸을 감싸는 frame, 목록 칸에 붙일 높이 class입니다. 두 열 행 밖의 구역은 내용만큼 자랍니다. */
export function listBoxClasses(inRow: boolean): { section: string; frame: string; box: string } {
  return inRow ? ROW_BOX_CLASSES : FREE_BOX_CLASSES;
}

type FocusEmptyProps = {
  message: string;
  /** 안내 아래에 옅게 덧붙이는 한 줄입니다. */
  detail?: string;
  /** 칸이 놓이는 자리와 높이(listBoxClasses의 box)만 정합니다. */
  className?: string;
};

/** 지금 화면의 모든 구역이 보일 항목이 없을 때 같은 모양으로 보이는 안내 칸입니다. */
export function FocusEmpty({ message, detail, className = "" }: FocusEmptyProps) {
  return (
    <p
      className={`surface flex flex-col items-center justify-center gap-1 px-4 py-3 text-center text-xs text-emphasis-60 ${className}`}
    >
      {message}
      {detail && <span className="text-emphasis-50">{detail}</span>}
    </p>
  );
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
  /** 두 열 행 안에 놓이는 구역이면 listBoxClasses의 높이 규칙을 따릅니다. */
  inRow?: boolean;
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
  inRow = false,
  renderItem,
}: FocusListSectionProps<T>) {
  const { shown, action } = useListLimit(items, seeAllView);
  const classes = listBoxClasses(inRow);
  return (
    <section aria-label={title} className={`flex flex-col gap-2 ${classes.section}`}>
      <GroupHeading title={title} tone={tone} count={items.length}>
        <span className="ml-auto font-normal">{action}</span>
      </GroupHeading>
      {note}
      <div className={classes.frame}>
        {items.length === 0 ? (
          <FocusEmpty message={empty} className={classes.box} />
        ) : (
          <ul
            className={`surface flex flex-col divide-y divide-base-300 ${inRow ? "focus-scroll-shadow" : ""} ${classes.box}`}
          >
            {shown.map(renderItem)}
          </ul>
        )}
      </div>
    </section>
  );
}
