import { readHumanDecisionCount } from "@/client/infra/humanDecisions/humanDecisionCountApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";

/** 사람 판단을 기다리는 일의 개수입니다. 지금 화면의 판단 기다림 카드와 같은 수입니다. */
export function useHumanDecisionCount(): WorkspaceReadState<number> {
  return useWorkspaceRead("humanDecisionCount", readHumanDecisionCount);
}
