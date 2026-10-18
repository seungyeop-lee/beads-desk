import { isLoopbackHost } from "@/server/web/http/loopbackHost";

/**
 * 서버는 127.0.0.1에만 바인딩하지만, 공격자 도메인이 DNS rebinding으로 127.0.0.1로 풀리면 브라우저는
 * 그 도메인의 페이지가 이 서버의 응답을 읽도록 허용합니다. 이때 Host와 Origin이 모두 공격자 도메인이라
 * Next가 Server Action에 적용하는 Origin·Host 비교도 통과하므로, Host가 로컬 호스트가 아닌 요청은 경로와 관계없이 거부합니다.
 * Server Action은 그 Action을 쓰는 화면 경로로 POST되므로, matcher로 적용 경로를 좁히지 않습니다.
 */
export function proxy(request: Request): Response | undefined {
  if (isLoopbackHost(request.headers.get("Host"))) return undefined;
  return new Response(null, { status: 403 });
}
