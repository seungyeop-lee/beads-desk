import type { Locator } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

test("작업 상태 묶음 머리줄의 묶음 이름, 이슈 개수, 설명 문구는 같은 baseline에 놓인다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssue("머리줄 검사 작업");

  await page.goto("/issues");
  const heading = page.getByRole("region", { name: "바로 작업 가능" }).getByRole("heading");
  await expect(heading).toBeVisible();

  const baselines = await textBaselines(heading);
  expect(baselines.map(({ text }) => text)).toEqual(["바로 작업 가능", "1", expect.any(String)]);
  const [first] = baselines;
  expect(baselines).toEqual(baselines.map(({ text }) => ({ text, baseline: first.baseline })));
});

/** 글자마다 앞에 높이 0인 inline-block을 넣어 그 아래 끝으로 baseline 위치를 잽니다. */
async function textBaselines(heading: Locator) {
  return heading.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    return texts.map((text) => {
      // flex 안의 글자는 span으로 감싸야 probe가 별도 flex item이 되지 않고 글자와 한 줄에 놓입니다.
      const host = document.createElement("span");
      const probe = document.createElement("span");
      probe.style.display = "inline-block";
      text.replaceWith(host);
      host.append(probe, text);
      const baseline = probe.getBoundingClientRect().bottom;
      host.replaceWith(text);
      return { text: text.data, baseline };
    });
  });
}
