import { findWorkspace } from "@/server/infra/runtime/serverRuntime";
import { respondJson } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { WORKSPACE_QUERY } from "@/shared/contract/workspaces";

/**
 * 요청의 workspace query가 가리키는 workspace 디렉터리를 cwd로 넘겨 respond를 실행합니다.
 * 등록하지 않은 이름이면 bd를 실행하지 않고 404로 답합니다. client가 임의의 디렉터리에서 bd를 실행하게 할 수 없도록,
 * 디렉터리 경로가 아니라 등록할 때 정한 이름만 받습니다.
 */
export async function withRequestWorkspace(
  request: Request,
  respond: (cwd: string) => Promise<Response>,
): Promise<Response> {
  const slug = new URL(request.url).searchParams.get(WORKSPACE_QUERY) ?? "";
  const workspace = findWorkspace(slug);
  if (!workspace) {
    return respondJson({ ok: false, error: (await serverMessages()).unknownWorkspace(slug) }, 404);
  }
  return respond(workspace.root);
}
