import { useState } from "react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { GroupHeading } from "./GroupHeading";

for (const width of [320, 1440]) {
  test(`폭 ${width}px에서 묶음 제목과 개수가 경계 안에 놓이고 긴 설명은 줄바꿈된다`, async () => {
    await page.viewport(width, 900);
    const screen = await render(
      <section aria-label="묶음 모음" className="w-full">
        {(["section", "list", "table", "board", "bare"] as const).map((variant) => (
          <GroupHeading
            key={variant}
            title={variant}
            count={123}
            tone="tone-sage"
            variant={variant}
          />
        ))}
        <Collapsible />
      </section>,
    );
    const box = screen.getByRole("region", { name: "묶음 모음" }).element().getBoundingClientRect();
    for (const heading of screen.getByRole("heading", { level: 2 }).elements()) {
      const rect = heading.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(box.left);
      expect(rect.right).toBeLessThanOrEqual(box.right);
      expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth);
    }
    const button = screen.getByRole("button", { name: "작업 묶음 접기" });
    const buttonBox = button.element().getBoundingClientRect();
    expect(buttonBox.left).toBeCloseTo(box.left + 4, 0);
    expect(buttonBox.right).toBeLessThanOrEqual(box.right - 4);
    await expect.element(button).toHaveAttribute("aria-expanded", "true");
    await button.click();
    await expect
      .element(screen.getByRole("button", { name: "작업 묶음 펼치기" }))
      .toHaveAttribute("aria-expanded", "false");
    expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
  });
}

function Collapsible() {
  const [expanded, setExpanded] = useState(true);
  return (
    <GroupHeading
      title="작업 묶음"
      count={100}
      tone="tone-sage"
      disclosure={{
        expanded,
        label: expanded ? "작업 묶음 접기" : "작업 묶음 펼치기",
        onToggle: () => setExpanded(!expanded),
      }}
    >
      <span className="text-xs text-emphasis-50">
        여러 작업의 현재 상태와 다음에 할 일을 설명하는 긴 안내 문구입니다.
      </span>
    </GroupHeading>
  );
}
