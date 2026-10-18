import { isAbsolute, extname } from "node:path";
import { readLocalFile } from "@/server/infra/localFiles/readLocalFile";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { isCrossSiteRequest } from "@/server/web/http/crossSiteRequest";
import { serverMessages } from "@/server/web/locale/serverMessages";

const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};
const TEXT_CONTENT_TYPE = "text/plain; charset=utf-8";

/** local file 응답에 공통으로 붙는 header입니다. 브라우저가 응답을 저장하거나 실행하지 못하게 막습니다. */
const FILE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "sandbox; default-src 'none'",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export async function handleLocalFileRequest(request: Request): Promise<Response> {
  const messages = await serverMessages();

  // 로컬 호스트가 아닌 Host의 요청은 proxy가 먼저 거부합니다.
  if (isCrossSiteRequest(request)) return localFileResponse(messages.localFileForbidden, 403);

  const path = requestedPath(request);
  if (path === null) return localFileResponse(messages.invalidRequest, 400);

  const file = await readLocalFile(currentWorkspaceRoot(), path);
  if (file.status !== 200) {
    const text = file.status === 403 ? messages.localFileForbidden : messages.localFileNotFound;
    return localFileResponse(text, file.status);
  }
  // HTML·SVG·스크립트도 텍스트로 응답해 앱과 같은 origin에서 실행되지 않게 합니다.
  return localFileResponse(
    file.contents,
    200,
    IMAGE_TYPES[extname(path).toLowerCase()] ?? TEXT_CONTENT_TYPE,
  );
}

/** query에서 파일 경로를 얻습니다. 절대 경로가 아니거나 null 문자가 든 경로는 null을 돌려줍니다. */
function requestedPath(request: Request): string | null {
  const path = new URL(request.url).searchParams.get("path");
  return path !== null && isAbsolute(path) && !path.includes("\0") ? path : null;
}

/** 보안 header를 붙여 local file 응답을 조립합니다. 본문을 성공적으로 보낼 때만 Content-Type을 정합니다. */
function localFileResponse(body: BodyInit, status: number, contentType?: string): Response {
  return new Response(body, {
    status,
    headers: {
      ...FILE_HEADERS,
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
  });
}
