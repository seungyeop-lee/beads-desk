import { type BdOutcome } from "@beads-desk/bd";
import { bdErrorMessage } from "@/server/web/locale/serverMessages";

/**
 * Route API의 JSON 응답을 조립합니다. 상태 코드를 생략하면 200입니다.
 * 응답 내용이 workspace 상태를 따르므로, 브라우저와 중간 proxy가 저장하지 않도록 no-store를 붙입니다.
 */
export function respondJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** 입력 검사에 실패한 요청에 돌려줄 400 응답을 조립합니다. */
export function respondBadRequest(error: string): Response {
  return respondJson({ ok: false, error }, 400);
}

/**
 * bd 실행 결과를 Route API 응답 형태로 바꿔 조립합니다.
 * 성공은 value를 data에 넣고, 실패는 화면에 보낼 오류 문구를 error에 넣어 500으로 돌려줍니다.
 */
export async function respondBdOutcome<T>(result: BdOutcome<T>): Promise<Response> {
  return result.ok
    ? respondJson({ ok: true, data: result.value })
    : respondJson({ ok: false, error: await bdErrorMessage(result.error) }, 500);
}

/** bd 결과의 성공값만 바꾸고 실패는 그대로 돌려줍니다. */
export function mapBdOutcome<T, U>(result: BdOutcome<T>, mapValue: (value: T) => U): BdOutcome<U> {
  return result.ok ? { ok: true, value: mapValue(result.value) } : result;
}
