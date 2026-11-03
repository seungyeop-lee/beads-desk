import { handleLocalFolderRequest } from "@/server/web/localFiles/localFolderRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleLocalFolderRequest(request);
}
