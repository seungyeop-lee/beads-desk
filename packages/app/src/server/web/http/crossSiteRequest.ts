/**
 * Route Handler는 Server Action과 달리 Next가 요청 출처를 검사하지 않습니다.
 * 브라우저는 다른 사이트에서 보낸 요청을 Sec-Fetch-Site로 표시하므로 표시된 요청을 거부하고,
 * bd-desk 명령처럼 이 헤더를 보내지 않는 요청은 통과합니다.
 */
export function isCrossSiteRequest(request: Request): boolean {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  return fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none";
}
