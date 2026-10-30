import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { DueAtField } from "./DueAtField";

/** 넓은 상세에서 속성 열의 값 칸 너비입니다. 속성 열 20rem에서 안쪽 여백과 이름 칸을 뺀 값입니다. */
const VALUE_COLUMN_WIDTH = "11.75rem";

async function renderField(value: number | null) {
  const onSave = vi.fn<(dueAt: string) => Promise<boolean>>().mockResolvedValue(true);
  const screen = await render(
    <LocaleProvider locale="ko">
      <div style={{ width: VALUE_COLUMN_WIDTH }}>
        <DueAtField value={value} onSave={onSave} />
      </div>
    </LocaleProvider>,
  );
  const open = () => screen.getByTitle(messages.editable.editField(messages.issue.dueAt)).click();
  return { screen, onSave, open };
}

test("날짜만 고르면 그날 현지 0시를, 시각까지 고르면 그 현지 시각을 UTC 시각으로 저장하고 저장한 값을 보인다", async () => {
  const { screen, onSave, open } = await renderField(null);
  const date = screen.getByLabelText(messages.dueAt.date);

  await expect.element(screen.getByText(messages.common.none)).toBeVisible();
  await open();
  await expect.element(date).toHaveFocus();
  await date.fill("2026-11-05");
  await screen.getByRole("button", { name: messages.common.save }).click();
  expect(onSave).toHaveBeenLastCalledWith(new Date(2026, 10, 5).toISOString());
  await expect
    .element(screen.getByTitle(messages.editable.editField(messages.issue.dueAt)))
    .toHaveTextContent("2026. 11. 5.");

  await open();
  await screen.getByLabelText(messages.dueAt.time).fill("15:30");
  await screen.getByRole("button", { name: messages.common.save }).click();
  expect(onSave).toHaveBeenLastCalledWith(new Date(2026, 10, 5, 15, 30).toISOString());
});

test("저장된 마감일을 열면 날짜와 시각이 채워져 있고, 지우기는 빈 값을 저장하며, Escape는 저장하지 않고 닫는다", async () => {
  const { screen, onSave, open } = await renderField(new Date(2026, 10, 5, 9, 5).getTime());

  await open();
  await expect.element(screen.getByLabelText(messages.dueAt.date)).toHaveValue("2026-11-05");
  await expect.element(screen.getByLabelText(messages.dueAt.time)).toHaveValue("09:05");
  await userEvent.keyboard("{Escape}");
  expect(onSave).not.toHaveBeenCalled();

  await open();
  await screen.getByRole("button", { name: messages.dueAt.clear }).click();
  expect(onSave).toHaveBeenLastCalledWith("");
  await expect.element(screen.getByText(messages.common.none)).toBeVisible();
});

test("넓은 상세의 속성 열 너비에서 날짜·시각 입력과 단추가 값 칸 밖으로 넘치지 않는다", async () => {
  const { screen, open } = await renderField(new Date(2026, 10, 5, 9, 5).getTime());

  await open();
  const form = screen
    .getByRole("button", { name: messages.common.save })
    .element()
    .closest("form")!;
  const column = form.parentElement!.getBoundingClientRect();
  for (const control of form.querySelectorAll("input, button")) {
    const box = control.getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(column.left);
    expect(box.right).toBeLessThanOrEqual(column.right);
  }
});
