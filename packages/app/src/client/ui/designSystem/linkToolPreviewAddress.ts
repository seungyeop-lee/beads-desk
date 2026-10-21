import type { PluginView } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";

/**
 * Milkdown 링크 도구 미리보기의 주소 글자가 본문의 같은 링크와 같은 주소(`linkAddress`의 결과)를 열게 하는 plugin view입니다.
 *
 * 미리보기는 mark의 href를 `sanitizeLinkHref`로만 걸러 `.link-display` 링크의 href에 넣고, 이 주소를 바꿀 설정이 없습니다.
 * 그대로 두면 Windows 경로는 빈 주소가 되어 지금 화면이 새 탭에 열리고, 절대경로와 화면 경로는 workspace가 빠진 앱 주소가 열립니다.
 * 그래서 미리보기 DOM에 기대어, `.link-display`의 글자로 보이는 mark의 href에서 주소를 구해 href를 덮어씁니다.
 * 미리보기는 Vue가 그리며 다른 링크를 보여 줄 때 글자와 href를 다시 그리므로, 그때마다 다시 덮어씁니다.
 */
export function previewAddressLinkTool(
  view: EditorView,
  linkAddress: (href: string) => string,
): PluginView {
  // 링크 도구는 편집기 DOM의 부모에 붙습니다.
  const root = view.dom.parentElement;
  const observer = new MutationObserver(() => {
    for (const display of root?.querySelectorAll(".milkdown-link-preview .link-display") ?? []) {
      const href = linkAddress(display.textContent ?? "");
      // 같은 값이면 쓰지 않아, 덮어쓴 변경이 이 observer를 다시 부르며 반복되지 않게 합니다.
      if (display.getAttribute("href") !== href) display.setAttribute("href", href);
    }
  });
  if (root) {
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ["href"],
    });
  }
  return { destroy: () => observer.disconnect() };
}
