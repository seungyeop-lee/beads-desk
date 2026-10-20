import { handleBoardRequest } from "@/server/web/board/boardRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleBoardRequest(request);
}
