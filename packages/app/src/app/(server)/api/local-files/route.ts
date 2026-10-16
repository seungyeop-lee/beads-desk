import { handleLocalFileRequest } from "@/server/web/localFiles/localFilesRouteApi";

export function GET(request: Request): Promise<Response> {
  return handleLocalFileRequest(request);
}
