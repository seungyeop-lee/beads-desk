import type { Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Milkdown 편집기에서 `text`가 처음 나오는 곳의 끝에 커서를 둡니다. 코드 블록처럼 한 줄이 여러 요소로
 * 나뉘어 그려져도 글자를 이어 붙여 끝나는 자리를 찾습니다.
 * 화면을 눌러 커서를 옮기면 브라우저가 DOM 선택만 바꾸는데, ProseMirror는 편집기가 focus를 받고 20ms 뒤
 * 아직 읽지 않은 DOM 선택을 편집기 상태의 선택(본문 맨 앞)으로 되돌립니다. 부하로 타이머가 만료된 채 기다리는 동안
 * 선택을 바꾸면 입력이 본문 맨 앞에 들어가므로, 선택을 바꾼 직후 selectionchange를 보내 편집기가 그 선택을
 * 상태에 바로 반영하게 합니다. 선택과 알림은 같은 evaluate 안에서 함께 일어나야 타이머가 사이에 끼어들지 않습니다.
 */
export async function placeCaretAfter(editor: Locator, text: string): Promise<void> {
  await expect(editor.getByText(text).first()).toBeVisible();
  await editor.evaluate((element, target) => {
    element.focus();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number }[] = [];
    let length = 0;
    for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
      const node = textNode as Text;
      nodes.push({ node, start: length });
      length += node.textContent?.length ?? 0;
    }
    const foundAt = nodes
      .map(({ node }) => node.textContent ?? "")
      .join("")
      .indexOf(target);
    if (foundAt < 0) {
      throw new Error(`편집기에서 ${target}가 들어 있는 글자를 찾지 못했습니다.`);
    }
    const end = foundAt + target.length;
    const holder = nodes.find(
      ({ node, start }) => end > start && end <= start + (node.textContent?.length ?? 0),
    )!;
    const range = document.createRange();
    range.setStart(holder.node, end - holder.start);
    range.collapse(true);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  }, text);
}
