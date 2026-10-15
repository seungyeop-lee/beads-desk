import type { Issue } from "@beads-desk/bd/issue";
import { readHygiene, readStaleIssues } from "@/client/infra/hygiene/hygieneApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { HygieneReport, StaleDays } from "@/shared/contract/hygiene";

export function useHygiene(): WorkspaceReadState<HygieneReport> {
  return useWorkspaceRead("hygiene", readHygiene);
}

export function useStaleIssues(staleDays: StaleDays): WorkspaceReadState<Issue[]> {
  return useWorkspaceRead(staleDays, readStaleIssues);
}
