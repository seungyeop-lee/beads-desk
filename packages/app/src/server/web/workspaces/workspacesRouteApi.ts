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

/** `beads-desk` 명령이 실행 중인 서버에 자신이 실행된 디렉터리를 등록할 때 호출합니다. */
export async function handleRegisterWorkspaceRequest(request: Request): Promise<Response> {
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
