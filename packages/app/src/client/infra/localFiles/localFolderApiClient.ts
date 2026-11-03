import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { localFolderApiPath, type LocalFolderPage } from "@/shared/contract/localFiles";

/** path 폴더의 항목을 cursor 다음 순서부터 한 묶음 읽습니다. cursor가 null이면 처음부터 읽습니다. */
export function readLocalFolder(
  path: string,
  cursor: string | null,
): Promise<ApiResponse<LocalFolderPage>> {
  return readApi(localFolderApiPath(path, cursor));
}
