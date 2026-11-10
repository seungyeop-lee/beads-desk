import { useEffect, useRef, useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { EpicMembershipLink } from "./EpicMembershipLink";

const TITLE = "결제와 로그인 흐름을 개선하는 epic";

function Fixture({ title = TITLE, width = 120 }: { title?: string; width?: number }) {
  const [size, setSize] = useState(width);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = list.current!;
    const open = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("a")) return;
      event.preventDefault();
      dialog.current!.showModal();
    };
    element.addEventListener("click", open, true);
    return () => element.removeEventListener("click", open, true);
  }, []);
  return (
    <LocaleProvider locale="ko">
      <button onClick={() => setSize(size === 120 ? 800 : 120)}>너비 변경</button>
      <section ref={list} aria-label="목록" style={{ height: 100, overflow: "auto", width: size }}>
        <EpicMembershipLink href="?issue=epic" title={title} />
        <div style={{ height: 400 }} />
      </section>
      <dialog ref={dialog} aria-label="epic 상세">
        <button onClick={() => dialog.current!.close()}>닫기</button>
      </dialog>
    </LocaleProvider>
  );
}

test("잘리지 않은 짧은 제목은 hover와 키보드 focus에서 중복 표시하지 않는다", async () => {
  const screen = await render(<Fixture title="짧음" />);
  const link = screen.getByRole("link", { name: messages.issueTable.openEpic("짧음") });
  await userEvent.hover(link);
  await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
  await userEvent.unhover(link);
  await screen.getByRole("button", { name: "너비 변경" }).click();
  await userEvent.tab();
  await expect.element(link).toHaveFocus();
  await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
});

test("같은 제목도 실제 너비에 따라 전문을 표시하고 열린 상태의 너비 변경은 닫는다", async () => {
  const screen = await render(<Fixture />);
  const link = screen.getByRole("link", { name: messages.issueTable.openEpic(TITLE) });
  const region = screen.getByRole("region", { name: "목록" }).element() as HTMLElement;
  const text = link.element().firstElementChild!;
  expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  await userEvent.hover(link);
  await expect
    .element(page.getByRole("tooltip"))
    .toHaveTextContent(messages.issueTable.epicMembership(TITLE));
  region.style.width = "800px";
  await expect.poll(() => text.clientWidth).toBe(text.scrollWidth);
  await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
  await userEvent.unhover(link);
  await userEvent.hover(link);
  await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
  region.style.width = "120px";
  await expect.poll(() => text.scrollWidth > text.clientWidth).toBe(true);
  await userEvent.unhover(link);
  await userEvent.hover(link);
  await expect.element(page.getByRole("tooltip")).toBeVisible();
});

test("body portal 전문은 중첩 목록 스크롤과 focus 밖 Escape에서도 닫힌다", async () => {
  const screen = await render(<Fixture />);
  const link = screen.getByRole("link", { name: messages.issueTable.openEpic(TITLE) });
  await screen.getByRole("button", { name: "너비 변경" }).element().focus();
  await userEvent.tab();
  await expect.element(link).toHaveFocus();
  await expect.element(page.getByRole("tooltip")).toBeVisible();
  const region = screen.getByRole("region", { name: "목록" }).element();
  region.scrollTop = 30;
  await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
  region.scrollTop = 0;
  await userEvent.tab({ shift: true });
  await userEvent.unhover(link);
  await userEvent.hover(link);
  await expect.element(page.getByRole("tooltip")).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
});

test("긴 제목을 클릭해 모달을 닫으면 focus만 복귀하고 재hover와 키보드 재진입은 전문을 연다", async () => {
  const screen = await render(<Fixture />);
  const link = screen.getByRole("link", { name: messages.issueTable.openEpic(TITLE) });
  const tooltip = page.getByRole("tooltip");
  await userEvent.hover(link);
  await expect.element(tooltip).toBeVisible();
  await link.click();
  await expect.element(screen.getByRole("dialog", { name: "epic 상세" })).toBeVisible();
  await expect.element(tooltip).not.toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  await expect.element(link).toHaveFocus();
  await expect.element(tooltip).not.toBeInTheDocument();
  await userEvent.unhover(link);
  await userEvent.hover(link);
  await expect.element(tooltip).toBeVisible();
  await userEvent.unhover(link);
  await expect.element(tooltip).not.toBeInTheDocument();
  await userEvent.tab({ shift: true });
  await userEvent.tab();
  await expect.element(link).toHaveFocus();
  await expect.element(tooltip).toBeVisible();
});
