import { afterEach, beforeEach, expect, vi } from "vitest";

/** 라우트 API 테스트가 공통으로 쓰는 workspace 경로입니다. */
const routeApiWorkspace = "/workspace";

/** 라우트 API 테스트의 workspace를 화면 주소에서 가리키는 이름입니다. 디렉터리 이름과 같습니다. */
export const routeApiWorkspaceSlug = "workspace";

/** 라우트 API 테스트의 workspace를 가리키는 요청을 만듭니다. path에 query가 있으면 그 뒤에 붙입니다. */
export function routeApiRequest(path = "/api", init?: RequestInit): Request {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("workspace", routeApiWorkspaceSlug);
  return new Request(url, init);
}

// 이 module을 import한 테스트 파일은 workspace를 고정해 두고, 테스트가 끝나면 원래 값과 mock을 되돌립니다.
// bd 함수 mock은 파일마다 목록이 다르므로 각 테스트 파일의 vi.mock에서 골라 만듭니다.
beforeEach(() => {
  vi.stubEnv("BEADS_DESK_WORKSPACE", routeApiWorkspace);
});

afterEach(() => {
  vi.unstubAllEnvs();
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
