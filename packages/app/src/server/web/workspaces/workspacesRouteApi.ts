import {
  currentWorkspaceRoot,
  listWorkspaces,
  registerWorkspace,
  selectWorkspace,
} from "@/server/infra/runtime/serverRuntime";
import { isCrossSiteRequest } from "@/server/web/http/crossSiteRequest";
import { respondJson } from "@/server/web/http/routeResponse";
import type { RegisterWorkspaceRequest, WorkspaceList } from "@/shared/contract/workspaces";

export function handleWorkspacesRequest(): Response {
  return respondJson({ ok: true, data: workspaceList() });
}

/**
 * `bd-desk` 명령이 실행 중인 서버에 자신이 실행된 디렉터리를 등록할 때 호출합니다.
 * 오류 문구는 명령이 터미널에 그대로 출력하므로, 화면 언어를 따르지 않고 명령의 다른 출력과 같은 영어로 둡니다.
 */
export async function handleRegisterWorkspaceRequest(request: Request): Promise<Response> {
  // 다른 사이트의 페이지는 브라우저가 사전 확인 없이 보내는 text/plain POST를 만들 수 있으므로 JSON 본문만 받습니다.
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return respondJson({ ok: false, error: "Only JSON request bodies are accepted." }, 415);
  }
  if (isCrossSiteRequest(request)) {
    return respondJson({ ok: false, error: "Cross-site requests are not accepted." }, 403);
  }
  const body: unknown = await request.json().catch(() => null);
  if (!isRegisterRequest(body)) {
    return respondJson({ ok: false, error: "The request is malformed." }, 400);
  }
  const root = registerWorkspace(body.path);
  if (!root) {
    return respondJson({ ok: false, error: `No beads workspace found: ${body.path}` }, 400);
  }
  if (body.select) selectWorkspace(root);
  return respondJson({ ok: true, data: workspaceList() });
}

function workspaceList(): WorkspaceList {
  return { current: currentWorkspaceRoot(), workspaces: listWorkspaces() };
}

function isRegisterRequest(value: unknown): value is RegisterWorkspaceRequest {
  if (typeof value !== "object" || value === null) return false;
  const { path, select } = value as Record<string, unknown>;
  return typeof path === "string" && (select === undefined || typeof select === "boolean");
}
