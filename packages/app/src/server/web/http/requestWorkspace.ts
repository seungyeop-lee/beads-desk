import { findWorkspace } from "@/server/infra/runtime/serverRuntime";
import { respondJson } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { WORKSPACE_QUERY, type Workspace } from "@/shared/contract/workspaces";

/**
 * 요청의 workspace query가 가리키는 등록한 workspace를 찾습니다. query가 없거나 등록하지 않은
 * 이름이면 workspace는 null이고, slug는 없는 이름을 알리는 응답에 보여 줄 요청한 이름 그대로입니다.
 */
export function requestWorkspace(request: Request): { slug: string; workspace: Workspace | null } {
  const slug = new URL(request.url).searchParams.get(WORKSPACE_QUERY) ?? "";
  return { slug, workspace: findWorkspace(slug) };
}

/** 요청의 workspace query들이 가리키는 등록한 workspace들입니다. 등록하지 않은 이름은 건너뜁니다. */
export function requestWorkspaces(request: Request): Workspace[] {
  const slugs = new Set(new URL(request.url).searchParams.getAll(WORKSPACE_QUERY));
  return [...slugs].flatMap((slug) => {
    const workspace = findWorkspace(slug);
    return workspace ? [workspace] : [];
  });
}

/**
 * 요청의 workspace query가 가리키는 workspace 디렉터리를 cwd로 넘겨 respond를 실행합니다.
 * 등록하지 않은 이름이면 bd를 실행하지 않고 404로 답합니다. client가 임의의 디렉터리에서 bd를 실행하게 할 수 없도록,
 * 디렉터리 경로가 아니라 등록할 때 정한 이름만 받습니다.
 */
export async function withRequestWorkspace(
  request: Request,
  respond: (cwd: string) => Promise<Response>,
): Promise<Response> {
  const { slug, workspace } = requestWorkspace(request);
  if (!workspace) {
    return respondJson({ ok: false, error: (await serverMessages()).unknownWorkspace(slug) }, 404);
  }
  return respond(workspace.root);
}
