import { readDecisions } from "@/client/infra/decisions/decisionsApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { DecisionSummary } from "@/shared/contract/decisions";

export function useDecisions(): WorkspaceReadState<DecisionSummary[]> {
  return useWorkspaceRead("decisions", readDecisions);
}
