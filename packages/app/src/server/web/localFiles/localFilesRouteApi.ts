import { isAbsolute, extname } from "node:path";
import { readLocalFile } from "@/server/infra/localFiles/readLocalFile";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { serverMessages } from "@/server/web/locale/serverMessages";

const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};
// DNS rebinding으로 공격자 도메인을 127.0.0.1로 풀면 same-origin 요청으로 Sec-Fetch-Site 검사를 통과하므로,
// Host가 로컬 호스트인지도 검사합니다.
const LOOPBACK_HOSTS: Record<string, true> = {
  localhost: true,
  "127.0.0.1": true,
  "[::1]": true,
};

function isLoopbackHost(host: string | null): boolean {
  if (host === null) return false;
  // Host 헤더의 IPv6는 [::1]:3000처럼 괄호로 감싸므로 포트를 뗄 때 형식을 나눕니다.
  const name = host.toLowerCase();
  const hostname = name.startsWith("[")
    ? name.slice(0, name.indexOf("]") + 1)
    : name.replace(/:\d+$/, "");
  return LOOPBACK_HOSTS[hostname] === true;
}

export async function handleLocalFileRequest(request: Request): Promise<Response> {
  const messages = await serverMessages();
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none") {
    return new Response(messages.localFileForbidden, { status: 403, headers });
  }
  if (!isLoopbackHost(request.headers.get("Host"))) {
    return new Response(messages.localFileForbidden, { status: 403, headers });
  }
  const path = new URL(request.url).searchParams.get("path");
  if (!path || !isAbsolute(path) || path.includes("\0")) {
    return new Response(messages.invalidRequest, { status: 400, headers });
  }
  const file = await readLocalFile(currentWorkspaceRoot(), path);
  if (file.status !== 200) {
    return new Response(
      file.status === 403 ? messages.localFileForbidden : messages.localFileNotFound,
      {
        status: file.status,
        headers,
      },
    );
  }
  // HTML·SVG·스크립트도 텍스트로 응답해 앱과 같은 origin에서 실행되지 않게 합니다.
  return new Response(file.contents, {
    headers: {
      ...headers,
      "Content-Type": IMAGE_TYPES[extname(path).toLowerCase()] ?? "text/plain; charset=utf-8",
    },
  });
}
