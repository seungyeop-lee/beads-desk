import { LOGO_BEADS } from "@/client/ui/shell/logoBeads";

export const contentType = "image/svg+xml";

/**
 * 헤더 로고와 같은 구슬 배치로 그린 favicon입니다.
 * 파스텔 구슬은 밝은 탭에서 잘 보이지 않아서 헤더 로고처럼 잉크색 테두리를 두르되, 16px로 줄어도 보이도록 더 진하게 그립니다.
 * 배경을 깔면 화면의 밝은 면과 다른 인상이 되므로 구슬만 그립니다.
 * 브라우저 테마로 바꾼 탭 색은 prefers-color-scheme과 다를 수 있으므로 테두리 색을 바꾸지 않고 고정합니다.
 */
export default function Icon() {
  const beads = LOGO_BEADS.map(
    ({ color }, index) =>
      `<circle cx="${7.5 + (index % 2) * 15}" cy="${7.5 + Math.floor(index / 2) * 15}" r="6.5" fill="${color}"/>`,
  ).join("");
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g stroke="#1c1917" stroke-opacity="0.45" stroke-width="1.25">${beads}</g></svg>`,
    { headers: { "Content-Type": contentType } },
  );
}
