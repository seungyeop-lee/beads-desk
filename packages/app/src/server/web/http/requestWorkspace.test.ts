import { expect, test, vi } from "vitest";
import { routeApiRequest } from "@/server/web/http/routeApiTest";
import { withRequestWorkspace } from "./requestWorkspace";

vi.mock("@/server/web/locale/requestLocale", () => ({ requestLocale: async () => "ko" }));

const respond = vi.fn<(cwd: string) => Promise<Response>>();

test("등록한 workspace 이름이면 그 디렉터리를 cwd로 넘겨 응답한다", async () => {
  const answer = new Response("ok");
  respond.mockResolvedValue(answer);

  const response = await withRequestWorkspace(routeApiRequest(), respond);

  expect(respond).toHaveBeenCalledWith("/workspace");
  expect(response).toBe(answer);
});

// 깨진 percent 인코딩은 URL이 오류 없이 U+FFFD로 바꿔 읽으므로, 앞부분이 등록한 이름과 같아도 다른 이름이 됩니다.
test.each([
  ["등록하지 않은 이름", "http://localhost/api?workspace=other", "other"],
  ["이름이 없는 요청", "http://localhost/api", ""],
  [
    "decode할 수 없는 이름",
    "http://localhost/api?workspace=workspace%E0%A4%A",
    "workspace\uFFFD%A",
  ],
])("%s은 bd를 실행하지 않고 404로 답한다", async (_case, url, slug) => {
  const response = await withRequestWorkspace(new Request(url), respond);

  expect(respond).not.toHaveBeenCalled();
  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({
    ok: false,
    error: `등록되지 않은 workspace입니다: ${slug}. 그 디렉터리에서 bd-desk start를 실행해 등록해 주세요.`,
  });
});
