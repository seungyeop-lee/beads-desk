import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { MarkdownEditor } from "./MarkdownEditor";

// pele module은 테스트 파일마다 처음 불러올 때 한 번만 만들어집니다. 이 파일에 그림을 그리는 테스트를 더하면 먼저 실행된 테스트가
// module을 불러 와서 아래 테스트가 module을 기다리게 만들 수 없으므로, 그런 테스트는 MarkdownEditor.browser.test.tsx에 둡니다.
const peleModule = vi.hoisted(() => {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  return { requested: false, released, release };
});

vi.mock("pele/lazy", async (importOriginal) => {
  peleModule.requested = true;
  await peleModule.released;
  return importOriginal();
});

const markdown = (code: string) => `\`\`\`mermaid\n${code}\n\`\`\``;

test("pele module이 늦게 도착하면 그동안 다른 언어로 바꾼 블록에는 그림을 넣지 않고, 나머지 블록은 그린다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor
        value={`${markdown("flowchart LR\n A[처음 그림] --> B")}\n\n${markdown("flowchart LR\n A[남은 그림] --> B")}`}
        label="설명"
      />
    </LocaleProvider>,
  );
  await expect.poll(() => screen.container.querySelectorAll(".cm-content")).toHaveLength(2);
  await expect.poll(() => peleModule.requested).toBe(true);
  const [first, second] = screen.container.querySelectorAll(".milkdown-code-block");

  await userEvent.fill(first!.querySelector(".cm-content")!, "flowchart LR\n A[폐기할 입력] --> B");
  await screen
    .getByRole("button", { name: /^mermaid$/i })
    .first()
    .click();
  await page
    .getByRole("listitem")
    .filter({ hasText: /^JavaScript$/ })
    .click();
  expect(screen.container.querySelector(".preview svg")).toBeNull();
  peleModule.release();

  await expect
    .poll(() => second!.querySelector(".preview svg")?.textContent)
    .toContain("남은 그림");
  // 같은 종류의 그림은 요청한 순서대로 끝나므로, 나중에 요청한 그림이 나타나면 먼저 요청한 그림은 모두 끝났습니다.
  await userEvent.fill(
    second!.querySelector(".cm-content")!,
    "flowchart LR\n A[마지막 그림] --> B",
  );
  await expect
    .poll(() => second!.querySelector(".preview svg")?.textContent)
    .toContain("마지막 그림");
  expect(first!.querySelector(".preview-panel")).toBeNull();
  expect(first!.querySelector(".cm-content")?.textContent).toContain("폐기할 입력");
});
