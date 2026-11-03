import { type FolderPosition, listLocalFolder } from "@/server/infra/localFiles/listLocalFolder";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBadRequest, respondJson } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { LOCAL_FOLDER_PAGE_SIZE, type LocalFolderPage } from "@/shared/contract/localFiles";
import { requestedPath } from "./localFilesRouteApi";

/** 폴더 화면이 읽는 폴더 목록을 한 묶음씩 돌려줍니다. 허용 루트 규칙은 파일 API와 같습니다. */
export async function handleLocalFolderRequest(request: Request): Promise<Response> {
  const messages = await serverMessages();
  const path = requestedPath(request);
  const after = requestedCursor(request);
  if (path === null || after === "invalid") return respondBadRequest(messages.invalidRequest);

  return withRequestWorkspace(request, async (root) => {
    const folder = await listLocalFolder(root, path, after, LOCAL_FOLDER_PAGE_SIZE);
    if (folder.status !== 200) {
      const error =
        folder.status === 403 ? messages.localFolderForbidden : messages.localFolderNotFound;
      return respondJson({ ok: false, error }, folder.status);
    }
    const { entries, total, next } = folder;
    const page: LocalFolderPage = {
      entries,
      total,
      next: next && JSON.stringify([next.folder, next.modifiedAt, next.name]),
    };
    return respondJson({ ok: true, data: page });
  });
}

/** query의 cursor를 목록 자리로 풉니다. cursor가 없으면 null이고, 이 API가 보낸 형식이 아니면 invalid입니다. */
function requestedCursor(request: Request): FolderPosition | null | "invalid" {
  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(cursor);
  } catch {
    return "invalid";
  }
  if (!Array.isArray(value) || value.length !== 3) return "invalid";
  const [folder, modifiedAt, name] = value as unknown[];
  if (typeof folder !== "boolean" || typeof name !== "string") return "invalid";
  if (typeof modifiedAt !== "number" || !Number.isFinite(modifiedAt)) return "invalid";
  return { folder, modifiedAt, name };
}
