import { type BdOutcome } from "@beads-desk/bd";

/**
 * Route API의 JSON 응답을 조립합니다. 상태 코드를 생략하면 200입니다.
 * 응답 내용이 현재 workspace 상태를 따르므로, 브라우저와 중간 proxy가 저장하지 않도록 no-store를 붙입니다.
 */
export function respondJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * bd 실행 결과를 Route API 응답 형태로 바꿔 조립합니다.
 * 성공은 value를 data에 넣고, 실패는 메시지의 앞뒤 공백을 덜어 error에 넣어 500으로 돌려줍니다.
 */
export function respondBdOutcome<T>(result: BdOutcome<T>): Response {
  return respondJson(
    result.ok
      ? { ok: true, data: result.value }
      : { ok: false, error: result.error.message.trim() },
    result.ok ? 200 : 500,
  );
}
