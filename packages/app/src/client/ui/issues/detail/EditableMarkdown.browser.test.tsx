import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { escapeStepHandlers } from "@/client/ui/designSystem/modal";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { EditableMarkdown } from "./EditableMarkdown";
import { codeMirrorDom } from "@/client/ui/designSystem/codeMirrorDom.testkit";
import { milkdownDom } from "@/client/ui/designSystem/milkdownDom.testkit";

test("Windows 경로 링크가 있는 본문에서 다른 문단만 고쳐 저장하면 링크 원문은 글자 그대로 남는다", async () => {
  const link = "[a](C:\\work\\.beads\\a.md) ![그림](C:\\a_b\\_x.png)";
  const onSave = vi.fn<(value: string) => Promise<boolean>>(async () => true);
  const screen = await render(
    <LocaleProvider locale="ko">
      <EditableMarkdown label="설명" value={`${link}\n\n고칠 문단`} onSave={onSave} />
    </LocaleProvider>,
  );

  await screen.getByRole("button", { name: "편집" }).click();
  await screen.getByRole("textbox", { name: "설명" }).getByText("고칠 문단").click();
  await userEvent.keyboard("{End} 고침");
  await screen.getByRole("button", { name: "저장" }).click();

  await expect.poll(() => onSave.mock.calls).toEqual([[`${link}\n\n고칠 문단 고침`]]);
});

test("코드 블록 안에서 언어를 바꾸고 고친 뒤 Ctrl/Cmd+Enter를 누르면 바꾼 언어와 고친 코드로 저장한다", async () => {
  const onSave = vi.fn<(value: string) => Promise<boolean>>(async () => true);
  const screen = await render(
    <LocaleProvider locale="ko">
      <EditableMarkdown
        label="설명"
        value={"```mermaid\nflowchart LR\n  A[시작] --> B\n```"}
        onSave={onSave}
      />
    </LocaleProvider>,
  );

  await screen.getByRole("button", { name: "편집" }).click();
  const editor = screen.getByRole("textbox", { name: "설명" });
  await editor.getByRole("button", { name: /^mermaid$/i }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: /^JavaScript$/ })
    .click();
  await expect.poll(() => editor.element().querySelector(milkdownDom.previewPanel)).toBeNull();
  await userEvent.click(editor.element().querySelector(codeMirrorDom.content)!);
  await userEvent.keyboard("{ControlOrMeta>}{End}{/ControlOrMeta} // 고침");
  await userEvent.keyboard("{ControlOrMeta>}{Enter}{/ControlOrMeta}");

  await expect
    .poll(() => onSave.mock.calls)
    .toEqual([["```JavaScript\nflowchart LR\n  A[시작] --> B // 고침\n```"]]);
});

test("상세 dialog 안에서 편집 중에 누른 Escape는 dialog를 닫지 않고 편집을 잇고, 취소 단추를 누르면 고친 내용을 저장하지 않고 원래 본문을 보인다", async () => {
  const onSave = vi.fn<(value: string) => Promise<boolean>>(async () => true);
  const closeStep = vi.fn<() => boolean>(() => false);
  // 상세 dialog처럼 Escape 한 번에 한 단계를 닫는 처리기를 둡니다. 편집기가 Escape를 쓰지 않으면 dialog가 닫힙니다.
  const screen = await render(
    <LocaleProvider locale="ko">
      <dialog {...escapeStepHandlers(closeStep)}>
        <EditableMarkdown label="설명" value="그대로 둘 문단" onSave={onSave} />
      </dialog>
    </LocaleProvider>,
  );
  const dialog = screen.container.querySelector("dialog")!;
  dialog.showModal();

  await screen.getByRole("button", { name: "편집" }).click();
  const editor = screen.getByRole("textbox", { name: "설명" });
  await editor.getByText("그대로 둘 문단").click();
  await userEvent.keyboard("{End} 버릴 글자");
  await userEvent.keyboard("{Escape}");
  await expect.element(editor).toHaveFocus();
  await expect.element(editor).toHaveTextContent("그대로 둘 문단 버릴 글자");
  expect(dialog.open).toBe(true);
  expect(closeStep).not.toHaveBeenCalled();

  await screen.getByRole("button", { name: "취소" }).click();
  await expect.element(editor).not.toBeInTheDocument();
  await expect.element(screen.getByText("그대로 둘 문단", { exact: true })).toBeVisible();
  expect(onSave).not.toHaveBeenCalled();
});

test("저장하는 동안에는 편집기가 입력을 받지 않고, 저장이 끝나면 고친 내용을 저장한 것으로 보인다", async () => {
  let finish: (saved: boolean) => void = () => {};
  const onSave = vi.fn<(value: string) => Promise<boolean>>(
    () => new Promise((resolve) => (finish = resolve)),
  );
  const screen = await render(
    <LocaleProvider locale="ko">
      <EditableMarkdown label="설명" value="저장할 문단" onSave={onSave} />
    </LocaleProvider>,
  );

  await screen.getByRole("button", { name: "편집" }).click();
  const editor = screen.getByRole("textbox", { name: "설명" });
  await editor.getByText("저장할 문단").click();
  await userEvent.keyboard("{End} 고침");
  await userEvent.keyboard("{ControlOrMeta>}{Enter}{/ControlOrMeta}");

  await expect.poll(() => onSave.mock.calls).toEqual([["저장할 문단 고침"]]);
  await expect.element(editor).toHaveAttribute("contenteditable", "false");
  await expect.element(screen.getByRole("button", { name: "저장" })).toBeDisabled();

  finish(true);
  await expect.element(editor).not.toBeInTheDocument();
  await expect.element(screen.getByText("저장할 문단 고침", { exact: true })).toBeVisible();
});
