import { basename } from "node:path";

/**
 * 가짜 bd workspace 디렉터리(workDir)를 가리키는 Route API 요청을 만듭니다. path에 query가 있으면 그 뒤에 붙입니다.
 * 서버는 등록한 디렉터리 이름을 workspace 이름으로 쓰므로, 테스트마다 바뀌는 workDir의 디렉터리 이름을 workspace query에 넣습니다.
 */
export function fakeBdRouteApiRequest(workDir: string, path: string): Request {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("workspace", basename(workDir));
  return new Request(url);
}
