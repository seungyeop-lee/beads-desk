import { useMemo } from "react";
import type { Issue } from "@beads-desk/bd/issue";
import { useEpics } from "@/client/modules/epics/application/useEpics";
import { focusStats, type FocusStats } from "@/client/modules/focus/domain/focusStats";
import { focusView, type FocusView } from "@/client/modules/focus/domain/focusView";
import { useHumanDecisionCount } from "@/client/modules/humanDecisions/application/useHumanDecisionCount";
import { useHumanGateTitles } from "@/client/modules/humanGates/application/useHumanGateTitles";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import type { WorkspaceReadState } from "@/client/modules/workspace/application/useWorkspaceRead";
import type { EpicSummary } from "@/shared/contract/epics";

/**
 * Focus 화면이 보일 데이터를 읽어 조립합니다. now는 흐름 통계의 기간을 정하는 현재 시각(epoch ms)입니다.
 * 사람 판단 대기 개수는 상단 탭과 같은 조회를 써서 숫자의 출처를 하나로 둡니다.
 */
export function useFocusView(now: number): {
  issueList: WorkspaceReadState<Issue[]>;
  epics: WorkspaceReadState<EpicSummary[]>;
  humanDecisionCount: WorkspaceReadState<number>;
  /** 이슈 목록을 다 읽기 전에는 null입니다. */
  view: FocusView | null;
  stats: FocusStats | null;
  /** 이슈 id마다 제목입니다. 막힘 표시에 상대 이슈 이름을 보입니다. */
  titles: ReadonlyMap<string, string>;
  /** 열린 human gate의 id마다 제목입니다. */
  gateTitles: ReadonlyMap<string, string>;
} {
  const issueList = useIssueList();
  const epics = useEpics();
  const humanDecisionCount = useHumanDecisionCount();
  const gateTitles = useHumanGateTitles();
  const issues = issueList.data;
  const view = useMemo(
    () => (issues ? focusView(issues, epics.data ?? []) : null),
    [issues, epics.data],
  );
  const stats = useMemo(
    () => (issues ? focusStats(issues, epics.data ?? [], now) : null),
    [issues, epics.data, now],
  );
  const titles = useMemo(
    () => new Map((issues ?? []).map((issue) => [issue.id, issue.title])),
    [issues],
  );
  return { issueList, epics, humanDecisionCount, view, stats, titles, gateTitles };
}
