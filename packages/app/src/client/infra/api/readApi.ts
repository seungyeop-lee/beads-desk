import type { ApiResponse } from "@/shared/contract/apiResponse";

/** beads-desk API를 GET으로 읽습니다. 연결하지 못하거나 응답 형식이 다르면 실패 결과를 돌려줍니다. */
export async function readApi<T>(path: string): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(path, { cache: "no-store" });
  } catch {
    return { ok: false, error: "beads-desk 서버에 연결하지 못했습니다." };
  }
  try {
    const body: unknown = await response.json();
    if (isApiResponse(body)) return body as ApiResponse<T>;
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
