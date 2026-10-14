import {
  currentWorkspaceRoot,
  listWorkspaces,
  registerWorkspace,
  selectWorkspace,
} from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { RegisterWorkspaceRequest, WorkspaceList } from "@/shared/contract/workspaces";

export function handleWorkspacesRequest(): Response {
  return respond({ ok: true, data: workspaceList() }, 200);
}

/**
 * `bd-desk` 명령이 실행 중인 서버에 자신이 실행된 디렉터리를 등록할 때 호출합니다.
 * 오류 문구는 명령이 터미널에 그대로 출력하므로, 화면 언어를 따르지 않고 명령의 다른 출력과 같은 한국어로 둡니다.
 */
export async function handleRegisterWorkspaceRequest(request: Request): Promise<Response> {
  // Route Handler는 Server Action과 달리 Next가 요청 출처를 검사하지 않습니다.
  // 다른 사이트의 페이지가 현재 workspace를 바꾸지 못하게, 브라우저가 사전 확인 없이 보내는 JSON 외 본문과
  // 브라우저가 다른 사이트에서 보냈다고 표시한 요청을 거부합니다. bd-desk 명령은 Sec-Fetch-Site를 보내지 않습니다.
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return respond({ ok: false, error: "JSON 본문만 받습니다." }, 415);
  }
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none") {
    return respond({ ok: false, error: "다른 사이트에서 보낸 요청은 받지 않습니다." }, 403);
  }
  const body: unknown = await request.json().catch(() => null);
  if (!isRegisterRequest(body)) {
    return respond({ ok: false, error: "요청 형식이 올바르지 않습니다." }, 400);
  }
  const root = registerWorkspace(body.path);
  if (!root) {
    return respond({ ok: false, error: `beads workspace를 찾지 못했습니다: ${body.path}` }, 400);
  }
  if (body.select) selectWorkspace(root);
  return respond({ ok: true, data: workspaceList() }, 200);
}

function workspaceList(): WorkspaceList {
  return { current: currentWorkspaceRoot(), workspaces: listWorkspaces() };
}

function isRegisterRequest(value: unknown): value is RegisterWorkspaceRequest {
  if (typeof value !== "object" || value === null) return false;
  const { path, select } = value as Record<string, unknown>;
  return typeof path === "string" && (select === undefined || typeof select === "boolean");
}

function respond(body: ApiResponse<WorkspaceList>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
