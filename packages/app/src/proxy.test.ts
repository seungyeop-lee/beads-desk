import { expect, test } from "vitest";
import * as proxyModule from "./proxy";

const { proxy } = proxyModule;

const requestWithHost = (host?: string) =>
  new Request("http://127.0.0.1:3000/api/issues", {
    headers: host === undefined ? {} : { Host: host },
  });

test.each(["localhost", "localhost:3000", "127.0.0.1:3000", "[::1]:3000", "LOCALHOST:3000"])(
  "로컬 호스트 Host의 요청은 route로 넘긴다: %s",
  (host) => {
    expect(proxy(requestWithHost(host))).toBeUndefined();
  },
);

test.each(["evil.example:3000", "localhost.evil.example", "127.0.0.1.evil.example:3000"])(
  "로컬 호스트가 아닌 Host의 요청을 거부한다: %s",
  (host) => {
    expect(proxy(requestWithHost(host))?.status).toBe(403);
  },
);

test("Host 없는 요청을 거부한다", () => {
  expect(proxy(requestWithHost())?.status).toBe(403);
});

// Server Action은 쓰는 화면 경로로 POST되므로, matcher로 경로를 고르면 그 밖의 Action이 Host 검사를 거치지 않습니다.
test("모든 요청에 적용되도록 matcher config를 내보내지 않는다", () => {
  expect(Object.keys(proxyModule)).toEqual(["proxy"]);
});
