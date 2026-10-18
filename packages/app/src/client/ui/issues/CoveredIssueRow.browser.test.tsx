import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { CoveredIssueIdButton, CoveredIssueRow } from "./CoveredIssueRow";

for (const cover of [{ href: "/issues?issue=desk-1" }, { onSelect: () => {} }]) {
  test(`${"href" in cover ? "링크" : "선택 단추"}로 덮은 행에서 제목 글자 위는 덮는 층이 받아 pointer를, ID 위는 복사 단추가 받아 copy 커서를 보인다`, async () => {
    const screen = await render(
      <LocaleProvider locale="ko">
        <CoveredIssueRow issueId="desk-1" title="덮인 행" cover={cover} className="flex gap-2 p-3">
          <span>덮인 행</span>
          <CoveredIssueIdButton issueId="desk-1" short />
        </CoveredIssueRow>
      </LocaleProvider>,
    );

    const layer = screen.getByRole("href" in cover ? "link" : "button", { name: "desk-1 덮인 행" });
    const title = screen.getByText("덮인 행", { exact: true }).element();
    const idButton = screen.getByRole("button", { name: messages.copyId.labelOf("desk-1") });
    expect(elementAtCenter(title)).toBe(layer.element());
    expect(getComputedStyle(layer.element()).cursor).toBe("pointer");
    expect(elementAtCenter(idButton.element())).toBe(idButton.element());
    expect(getComputedStyle(idButton.element()).cursor).toBe("copy");
  });
}

function elementAtCenter(element: Element) {
  const box = element.getBoundingClientRect();
  return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
}
