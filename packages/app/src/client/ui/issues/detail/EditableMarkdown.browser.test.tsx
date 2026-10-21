import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { EditableMarkdown } from "./EditableMarkdown";

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
