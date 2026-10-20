import { LOGO_BEADS } from "@/client/ui/shell/logoBeads";

export const contentType = "image/svg+xml";

/**
 * 헤더 로고와 같은 구슬 배치로 그린 favicon입니다.
 * 파스텔 구슬은 밝은 탭에서 잘 보이지 않아서 어두운 둥근 사각형 위에 놓습니다.
 * 브라우저 테마로 바꾼 탭 색은 prefers-color-scheme과 다를 수 있으므로 배경색을 바꾸지 않고 고정합니다.
 */
export default function Icon() {
  const beads = LOGO_BEADS.map(
    ({ color }, index) =>
      `<circle cx="${9 + (index % 2) * 14}" cy="${9 + Math.floor(index / 2) * 14}" r="6" fill="${color}"/>`,
  ).join("");
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#1c1917"/>${beads}</svg>`,
    { headers: { "Content-Type": contentType } },
  );
}
