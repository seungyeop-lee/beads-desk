import { handleBoardRequest } from "@/server/web/board/boardRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handleBoardRequest();
}
