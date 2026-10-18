import { afterEach, beforeEach, expect, vi } from "vitest";

/** 라우트 API 테스트가 공통으로 쓰는 workspace 경로입니다. */
const routeApiWorkspace = "/workspace";

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

// 이 module을 import한 테스트 파일은 workspace를 고정해 두고, 테스트가 끝나면 원래 값과 mock을 되돌립니다.
// bd 함수 mock은 파일마다 목록이 다르므로 각 테스트 파일의 vi.mock에서 골라 만듭니다.
beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = routeApiWorkspace;
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.resetAllMocks();
});

/** 성공 응답은 no-store로 200에 data를 실어 보내는지 확인합니다. */
export async function expectRouteData(response: Response, data: unknown): Promise<void> {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  await expect(response.json()).resolves.toEqual({ ok: true, data });
}

/** bd 실행 실패 응답은 메시지를 500에 error로 실어 보내는지 확인합니다. */
export async function expectRouteBdError(response: Response, message: string): Promise<void> {
  expect(response.status).toBe(500);
  await expect(response.json()).resolves.toEqual({ ok: false, error: message });
}
