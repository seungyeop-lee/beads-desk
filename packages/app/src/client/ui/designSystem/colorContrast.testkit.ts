import { expect } from "vitest";

/** 계산된 CSS 색을 canvas에 칠해 0~255 sRGB 값으로 바꿉니다. 투명한 색이면 실패합니다. */
export function srgb(color: string): [number, number, number] {
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
  expect(alpha, `${color}는 불투명해야 합니다`).toBe(255);
  return [r!, g!, b!];
}

/** WCAG 상대 휘도입니다. */
function luminance(color: string): number {
  const [r, g, b] = srgb(color);
  const linear = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** 두 색의 WCAG 대비율입니다. */
export function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter! + 0.05) / (darker! + 0.05);
}
