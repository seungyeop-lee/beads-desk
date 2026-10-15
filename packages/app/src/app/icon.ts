import { LOGO_BEADS } from "@/client/ui/shell/logoBeads";

export const contentType = "image/svg+xml";

/** 헤더 로고와 같은 구슬 배치로 그린 favicon입니다. */
export default function Icon() {
  const beads = LOGO_BEADS.map(
    ({ color }, index) =>
      `<circle cx="${4 + (index % 2) * 10}" cy="${4 + Math.floor(index / 2) * 10}" r="3.75" fill="${color}"/>`,
  ).join("");
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><g stroke="#1c1917" stroke-opacity="0.12" stroke-width="0.5">${beads}</g></svg>`,
    { headers: { "Content-Type": contentType } },
  );
}
