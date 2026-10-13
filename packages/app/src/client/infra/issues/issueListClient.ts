import type { Issue } from "@beads-desk/bd/issue";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import {
  ISSUE_LIST_PATH,
  issueListSearchParams,
  type IssueListFilter,
} from "@/shared/contract/issueList";

export async function readIssueList(filter: IssueListFilter): Promise<ApiResponse<Issue[]>> {
  const query = issueListSearchParams(filter).toString();
  let response: Response;
  try {
    response = await fetch(query ? `${ISSUE_LIST_PATH}?${query}` : ISSUE_LIST_PATH, {
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "beads-desk 서버에 연결하지 못했습니다." };
  }
  try {
    const body: unknown = await response.json();
    if (isApiResponse(body)) return body as ApiResponse<Issue[]>;
  } catch {
    // 아래의 형식 오류로 처리합니다.
  }
  return { ok: false, error: "서버 응답을 해석하지 못했습니다." };
}

function isApiResponse(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !("ok" in value)) return false;
  if (value.ok === true) return "data" in value;
  return value.ok === false && "error" in value && typeof value.error === "string";
}
