import { boardIssues } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";
import type { BoardItem } from "@/shared/contract/board";

export function handleBoardRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome<BoardItem[]>(await boardIssues(cwd)),
  );
}
