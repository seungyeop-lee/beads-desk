import { listIssues } from "@beads-desk/bd";
import { boardItemsOf } from "@/server/modules/board/domain/boardItems";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";
import type { BoardItem } from "@/shared/contract/board";

export function handleBoardRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) => {
    const result = await listIssues(cwd, []);
    return respondBdOutcome<BoardItem[]>(
      result.ok ? { ok: true, value: boardItemsOf(result.value) } : result,
    );
  });
}
