import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { koMessages } from "@/client/modules/locale/domain/koMessages";
import { readLocalTextFile } from "./localFileApiClient";

const URL = "/api/local-files?path=%2Ftmp%2Fa.diff&workspace=demo";

beforeEach(() => {
  vi.stubGlobal("document", { documentElement: { lang: "ko" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** 조각마다 따로 읽히는 본문입니다. 받아 간 조각 수와 취소 여부를 함께 돌려줍니다. */
function chunkedBody(chunks: string[]) {
  const encoder = new TextEncoder();
  const state = { pulled: 0, canceled: false };
  // highWaterMark가 0이면 읽기를 요청받기 전에는 조각을 미리 받아 두지 않습니다.
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const chunk = chunks[state.pulled++];
        if (chunk === undefined) controller.close();
        else controller.enqueue(encoder.encode(chunk));
      },
      cancel() {
        state.canceled = true;
      },
    },
    { highWaterMark: 0 },
  );
  return { stream, state };
}

test("상한 이하의 파일은 UTF-8 글자로 읽는다", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response("+추가\n-삭제\n"));
  vi.stubGlobal("fetch", fetchMock);

  expect(await readLocalTextFile(URL, 64)).toEqual({ status: "loaded", text: "+추가\n-삭제\n" });
  expect(fetchMock.mock.calls[0]?.[0]).toBe(URL);
});

test("읽은 크기가 상한을 넘는 순간 읽기를 멈춘다", async () => {
  const { stream, state } = chunkedBody(["a".repeat(6), "b".repeat(5), "c".repeat(100)]);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(stream)),
  );

  expect(await readLocalTextFile(URL, 10)).toEqual({ status: "tooLarge" });
  expect(state.pulled).toBe(2);
  expect(state.canceled).toBe(true);
});

test("크기가 상한과 같으면 읽는다", async () => {
  const { stream } = chunkedBody(["a".repeat(6), "b".repeat(4)]);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(stream)),
  );

  expect(await readLocalTextFile(URL, 10)).toEqual({
    status: "loaded",
    text: "aaaaaabbbb",
  });
});

test("허용 범위 밖이거나 없는 파일이면 서버가 보낸 오류 문구를 돌려준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("허용된 위치 밖의 파일입니다.", { status: 403 })),
  );

  expect(await readLocalTextFile(URL, 64)).toEqual({
    status: "failed",
    error: "허용된 위치 밖의 파일입니다.",
  });
});

test("서버에 연결하지 못하면 연결 실패 문구를 돌려준다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }),
  );

  expect(await readLocalTextFile(URL, 64)).toEqual({
    status: "failed",
    error: koMessages.common.serverUnreachable,
  });
});
