import { readPreviousGateRounds } from "@/client/infra/humanGates/humanGatesApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { PreviousGateRound } from "@/shared/contract/humanGates";

/** 고른 gate와 같은 작업을 막았던 닫힌 gate(이전 라운드)의 기록을 읽습니다. */
export function usePreviousGateRounds(gateId: string): WorkspaceReadState<PreviousGateRound[]> {
  return useWorkspaceRead(gateId, readPreviousGateRounds);
}
