import { readHumanGates } from "@/client/infra/humanGates/humanGatesApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { HumanGateSummary } from "@/shared/contract/humanGates";

export function useHumanGates(): WorkspaceReadState<HumanGateSummary[]> {
  return useWorkspaceRead("humanGates", readHumanGates);
}
