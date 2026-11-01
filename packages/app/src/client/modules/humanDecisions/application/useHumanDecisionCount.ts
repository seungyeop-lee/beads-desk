import { readHumanDecisionCount } from "@/client/infra/humanDecisions/humanDecisionCountApiClient";
import { shareWorkspaceRead } from "@/client/modules/workspace/application/shareWorkspaceRead";
import { useSharedWorkspaceRead } from "@/client/modules/workspace/application/useSharedWorkspaceRead";
import type { WorkspaceReadState } from "@/client/modules/workspace/application/useWorkspaceRead";

// 이 hook을 쓰는 component가 한 화면에 여럿이어도 알림 한 번에 한 번만 읽도록 결과를 나눠 씁니다.
// 이 개수는 탭 제목에도 보여 탭이 가려진 동안에도 보이므로, 가려진 탭에서도 변경 알림을 받으면 바로 다시 읽습니다.
const humanDecisionCount = shareWorkspaceRead(readHumanDecisionCount, { whileHidden: true });

/** 사람 판단을 기다리는 일의 개수입니다. 상단 탭, 탭 제목, 지금 화면의 판단 기다림 카드가 같은 수를 씁니다. */
export function useHumanDecisionCount(): WorkspaceReadState<number> {
  return useSharedWorkspaceRead(humanDecisionCount);
}
