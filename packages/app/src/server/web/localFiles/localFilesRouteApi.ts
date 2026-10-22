import { isAbsolute, extname } from "node:path";
import {
  type ByteRange,
  readLocalFile,
  readLocalFileRange,
} from "@/server/infra/localFiles/readLocalFile";
import { isCrossSiteRequest } from "@/server/web/http/crossSiteRequest";
import { requestWorkspace } from "@/server/web/http/requestWorkspace";
import { serverMessages } from "@/server/web/locale/serverMessages";

const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};
const VIDEO_TYPES: Record<string, string> = {
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};
const TEXT_CONTENT_TYPE = "text/plain; charset=utf-8";

const SANDBOX_CSP = "sandbox; default-src 'none'";
// sandbox를 붙이면 문서 origin이 null이 되어 영상 문서가 같은 주소의 영상을 불러오지 못합니다.
// 영상 문서에는 스크립트가 없고 default-src 'none'이 남아 있어, sandbox를 빼도 실행되는 코드는 없습니다.
const VIDEO_CSP = "default-src 'none'; media-src 'self'";

/** local file 응답에 공통으로 붙는 header입니다. 브라우저가 응답을 저장하거나 실행하지 못하게 막습니다. */
const FILE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
};

type ServerMessages = Awaited<ReturnType<typeof serverMessages>>;

export async function handleLocalFileRequest(request: Request): Promise<Response> {
  const messages = await serverMessages();

  // 로컬 호스트가 아닌 Host의 요청은 proxy가 먼저 거부합니다.
  if (isCrossSiteRequest(request)) return localFileResponse(messages.localFileForbidden, 403);

  const path = requestedPath(request);
  if (path === null) return localFileResponse(messages.invalidRequest, 400);
  const { slug, workspace } = requestWorkspace(request);
  if (!workspace) return localFileResponse(messages.unknownWorkspace(slug), 404);

  const extension = extname(path).toLowerCase();
  const videoType = VIDEO_TYPES[extension];
  if (videoType) return videoResponse(request, workspace.root, path, videoType, messages);

  const file = await readLocalFile(workspace.root, path);
  if (file.status !== 200) return deniedResponse(file.status, messages);
  // HTML·SVG·스크립트도 텍스트로 응답해 앱과 같은 origin에서 실행되지 않게 합니다.
  return localFileResponse(file.contents, 200, {
    "Content-Type": IMAGE_TYPES[extension] ?? TEXT_CONTENT_TYPE,
  });
}

/** 브라우저가 재생 위치를 옮길 때 보내는 Range 요청에는 그 구간만 보냅니다. */
async function videoResponse(
  request: Request,
  workspaceRoot: string,
  path: string,
  contentType: string,
  messages: ServerMessages,
): Promise<Response> {
  const headers = {
    "Content-Type": contentType,
    "Content-Security-Policy": VIDEO_CSP,
    "Accept-Ranges": "bytes",
  };
  const rangeOf = requestedRange(request.headers.get("Range"));
  if (!rangeOf) {
    const file = await readLocalFile(workspaceRoot, path);
    if (file.status !== 200) return deniedResponse(file.status, messages);
    return localFileResponse(file.contents, 200, headers);
  }
  const part = await readLocalFileRange(workspaceRoot, path, rangeOf);
  if (part.status === 206) {
    const { start, end } = part.range;
    return localFileResponse(part.contents, 206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${part.size}`,
    });
  }
  if (part.status === 416) {
    return localFileResponse(null, 416, {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes */${part.size}`,
    });
  }
  return deniedResponse(part.status, messages);
}

/**
 * `bytes=` 단위의 구간 하나를 해석해, 파일 크기를 받아 구간을 고르는 함수로 돌려줍니다.
 * 형식이 맞지 않거나 여러 구간을 요청하면 null을 돌려주어 Range를 무시하고 전체를 보냅니다.
 * 고른 함수는 시작 위치가 파일 크기를 벗어나면 null을 돌려주고, 끝 위치는 파일 끝까지로 줄입니다.
 */
function requestedRange(header: string | null): ((size: number) => ByteRange | null) | null {
  const match = header?.trim().match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return null;
  const [, first = "", last = ""] = match;
  if (first === "") {
    if (last === "") return null;
    const length = Number(last);
    return (size) =>
      length > 0 && size > 0 ? { start: Math.max(0, size - length), end: size - 1 } : null;
  }
  const start = Number(first);
  if (last !== "" && Number(last) < start) return null;
  return (size) =>
    start < size ? { start, end: last === "" ? size - 1 : Math.min(Number(last), size - 1) } : null;
}

/** query에서 파일 경로를 얻습니다. 절대 경로가 아니거나 null 문자가 든 경로는 null을 돌려줍니다. */
function requestedPath(request: Request): string | null {
  const path = new URL(request.url).searchParams.get("path");
  return path !== null && isAbsolute(path) && !path.includes("\0") ? path : null;
}

function deniedResponse(status: 403 | 404, messages: ServerMessages): Response {
  const text = status === 403 ? messages.localFileForbidden : messages.localFileNotFound;
  return localFileResponse(text, status);
}

/** 보안 header를 붙여 local file 응답을 조립합니다. Content-Type은 본문을 제대로 보낼 때만 넘깁니다. */
function localFileResponse(
  body: BodyInit | null,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers: { ...FILE_HEADERS, "Content-Security-Policy": SANDBOX_CSP, ...headers },
  });
}
