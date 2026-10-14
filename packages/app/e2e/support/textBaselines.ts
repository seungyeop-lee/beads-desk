import type { Locator } from "@playwright/test";

/** 요소 안의 글자마다 앞에 높이 0인 inline-block을 넣어 그 아래 끝으로 baseline 위치를 잽니다. */
export async function textBaselines(element: Locator) {
  return element.evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
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
