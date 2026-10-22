import { type BdOutcome, type CloseOutcome } from "@beads-desk/bd";
import { findWorkspace } from "@/server/infra/runtime/serverRuntime";
import { checkWorkspaceChangesNow } from "@/server/infra/workspaceChanges/workspaceChangeFeed";
import { bdErrorMessage, serverMessages } from "@/server/web/locale/serverMessages";
import { mapBdOutcome } from "@/server/web/http/routeResponse";
import type { ApiFailure, ApiResponse } from "@/shared/contract/apiResponse";
import type { CloseIssueResult } from "@/shared/contract/issueActions";
import { isString } from "./issueActionGuards";

/**
 * 화면 주소의 workspace 이름이 가리키는 workspace 디렉터리에서 run을 실행합니다.
 * 디렉터리 경로가 아니라 등록할 때 정한 이름만 받아, 요청이 임의의 디렉터리에서 bd를 실행하게 할 수 없습니다.
 */
export async function write<T>(
  workspace: unknown,
  run: (cwd: string) => Promise<BdOutcome<T>>,
): Promise<ApiResponse<T>> {
  const cwd = workspaceRootOf(workspace);
  if (cwd === null) return unknownWorkspace(workspace);
  return finish(cwd, await run(cwd));
}

/** 닫기 결과를 CloseIssueResult 계약으로 조립합니다. 막힘이 풀린 이슈는 화면이 쓰는 id와 제목만 남깁니다. */
export async function writeClose(
  workspace: unknown,
  run: (cwd: string) => Promise<CloseOutcome>,
): Promise<CloseIssueResult> {
  const cwd = workspaceRootOf(workspace);
  if (cwd === null) return unknownWorkspace(workspace);
  const result = await run(cwd);
  // 닫기를 막아 바뀐 것은 없으므로 알리지 않고, 화면이 force로 다시 물을 수 있게 표시만 남깁니다.
  if (!result.ok && "closeBlocked" in result) {
    return { ok: false, closeBlocked: true, error: result.error.message.trim() };
  }
  return finish(
    cwd,
    mapBdOutcome(result, (issues) => issues.map(({ id, title }) => ({ id, title }))),
  );
}

// 쓰기가 성공하면 다음 polling 주기를 기다리지 않고 SSE로 다른 화면과 탭에 알립니다.
async function finish<T>(cwd: string, result: BdOutcome<T>): Promise<ApiResponse<T>> {
  if (!result.ok) return { ok: false, error: await bdErrorMessage(result.error) };
  await checkWorkspaceChangesNow(cwd);
  return { ok: true, data: result.value };
}

function workspaceRootOf(workspace: unknown): string | null {
  return isString(workspace) ? (findWorkspace(workspace)?.root ?? null) : null;
}

async function unknownWorkspace(workspace: unknown): Promise<ApiFailure> {
  const messages = await serverMessages();
  return isString(workspace)
    ? { ok: false, error: messages.unknownWorkspace(workspace) }
    : { ok: false, error: messages.invalidRequest };
}
