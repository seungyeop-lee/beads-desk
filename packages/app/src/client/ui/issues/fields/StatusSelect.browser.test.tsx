import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { StatusSelect } from "./StatusSelect";

/** 표 폭에 따라 chip이 놓일 수 있는 소수 픽셀 위치입니다. 화살표를 칸 경계에서 딱 끊어 그리면 이런 위치에서 줄이 빠져 납작해집니다. */
const OFFSETS = [0, 0.1, 0.25, 0.3, 0.5, 0.66, 0.75, 0.9].flatMap((left) =>
  [0, 0.3, 0.5].map((top) => ({ left, top })),
);

test("select chip의 화살표는 소수 픽셀 위치에 놓여도 같은 양으로 칠해진다", async () => {
  await page.viewport(400, 300);
  const amounts: { offset: string; ink: number }[] = [];
  for (const { left, top } of OFFSETS) {
    const screen = await render(
      <LocaleProvider locale="ko">
        <div style={{ paddingLeft: 40 + left, paddingTop: 20 + top }}>
          <StatusSelect value="closed" issueType="task" onChange={async () => true} />
        </div>
      </LocaleProvider>,
    );
    const select = screen.getByRole("combobox");
    const base64 = await page.screenshot({ element: select, save: false });
    amounts.push({ offset: `left ${left}, top ${top}`, ink: await arrowInk(base64) });
    await screen.unmount();
  }

  const smallest = Math.min(...amounts.map(({ ink }) => ink));
  expect(smallest, "화살표가 보여야 합니다").toBeGreaterThan(0);
  for (const { offset, ink } of amounts) {
    expect(ink / smallest, `${offset}에서 가장 적게 칠해진 위치와 비교한 화살표 양`).toBeLessThan(
      1.25,
    );
  }
});

/**
 * chip 오른쪽 여백에서 화살표 둘레만 잘라, 배경보다 어두운 정도를 모두 더합니다.
 * 위아래 끝은 둥근 모서리의 경계가 섞이지 않도록 뺍니다.
 */
async function arrowInk(base64: string) {
  const bitmap = await createImageBitmap(new Blob([Uint8Array.fromBase64(base64)]));
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d")!;
  context.drawImage(bitmap, 0, 0);
  const { data, width } = context.getImageData(0, 0, bitmap.width, bitmap.height);
  const luminance = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
  };

  const background = luminance(width - 12, 4);
  let ink = 0;
  for (let y = 8; y < bitmap.height - 7; y++) {
    for (let x = width - 18; x < width - 6; x++) {
      ink += Math.max(0, background - luminance(x, y));
    }
  }
  return ink;
}
