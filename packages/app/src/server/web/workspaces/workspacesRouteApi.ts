import { listWorkspaces, registerWorkspace } from "@/server/infra/runtime/serverRuntime";
import { isCrossSiteRequest } from "@/server/web/http/crossSiteRequest";
import { respondJson } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import type {
  RegisteredWorkspace,
  RegisterWorkspaceRequest,
  WorkspaceList,
} from "@/shared/contract/workspaces";

export function handleWorkspacesRequest(): Response {
  const list: WorkspaceList = { workspaces: listWorkspaces() };
  return respondJson({ ok: true, data: list });
}

/**
 * `bd-desk` 명령이 실행 중인 서버에 자신이 실행된 디렉터리를 등록할 때 호출합니다.
 * 오류 문구는 사전을 거치지만, 명령의 요청에는 언어 선호가 없으므로 터미널에는 영어로 출력됩니다.
 */
export async function handleRegisterWorkspaceRequest(request: Request): Promise<Response> {
  const messages = await serverMessages();
  // 다른 사이트의 페이지는 브라우저가 사전 확인 없이 보내는 text/plain POST를 만들 수 있으므로 JSON 본문만 받습니다.
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return respondJson({ ok: false, error: messages.nonJsonBody }, 415);
  }
  if (isCrossSiteRequest(request)) {
    return respondJson({ ok: false, error: messages.crossSiteForbidden }, 403);
  }
  const body: unknown = await request.json().catch(() => null);
  if (!isRegisterRequest(body)) {
    return respondJson({ ok: false, error: messages.invalidRequest }, 400);
  }
  const registered = registerWorkspace(body.path);
  if (!registered) {
    return respondJson({ ok: false, error: messages.beadsWorkspaceNotFound(body.path) }, 400);
  }
  const result: RegisteredWorkspace = { registered, workspaces: listWorkspaces() };
  return respondJson({ ok: true, data: result });
}

function isRegisterRequest(value: unknown): value is RegisterWorkspaceRequest {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as Record<string, unknown>).path === "string";
}
