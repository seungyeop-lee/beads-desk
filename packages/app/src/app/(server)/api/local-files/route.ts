import { handleLocalFileRequest } from "@/server/web/localFiles/localFilesRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleLocalFileRequest(request);
}
