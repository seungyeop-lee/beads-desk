import type { MarkType } from "@milkdown/kit/prose/model";
import type { PluginView } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { WINDOWS_DRIVE_PATH } from "@/client/modules/markdown/domain/drivePath";

/**
 * Milkdown 링크 도구에 Windows 드라이브 경로(`C:\a.md`, `C:/a.md`)를 넣고 확인해도 그 경로의 링크가 되게 하는 plugin view입니다.
 *
 * 링크 도구는 확인한 주소를 `sanitizeLinkHref`로 거르는데, 이 함수는 드라이브 문자 `C:`를 허용하지 않는 scheme으로 읽어
 * 주소를 비웁니다. 걸러 내는 동작을 바꿀 설정이 없으므로, 확인하려는 주소가 드라이브 경로일 때만 링크 도구보다 먼저 확인
 * 입력을 받아 Milkdown과 같은 방식으로 링크를 넣습니다. 드라이브 경로가 아닌 주소는 링크 도구가 그대로 걸러서
 * `javascript:` 같은 scheme은 계속 비워집니다. 링크를 그릴 때는 드라이브 경로를 로컬 파일 API 주소로 바꾸므로(`localMarkdownUrl`)
 * 경로가 DOM의 href에 그대로 들어가지 않습니다.
 */
export function drivePathLinkTool(view: EditorView, linkType: MarkType): PluginView {
  // 링크 도구는 편집기 DOM의 부모에 붙습니다. 편집기마다 자기 링크 도구의 입력만 받습니다.
  const root = view.dom.parentElement;

  const confirm = (event: Event, input: HTMLInputElement) => {
    const href = input.value.trim();
    if (!WINDOWS_DRIVE_PATH.test(href)) return;
    event.preventDefault();
    event.stopPropagation();
    // 링크 도구가 열려 있는 동안 편집기 선택 영역은 링크를 넣을 범위로 고정되고, 기존 링크를 고칠 때는 그 링크 전체입니다.
    const { from, to } = view.state.selection;
    const current = from < to ? linkType.isInSet(view.state.doc.nodeAt(from)?.marks ?? []) : null;
    // 주소를 고치지 않고 확인하면 mark를 그대로 두어, 원문 주소(sourceUrl)를 저장할 때 쓸 수 있게 합니다.
    if (current?.attrs.href !== href) {
      const tr = view.state.tr.removeMark(from, to, linkType);
      if (from === to) tr.insertText(href, from);
      view.dispatch(
        tr.addMark(from, from === to ? from + href.length : to, linkType.create({ href })),
      );
    }
    // 링크 도구를 닫는 API가 없어서, 링크 도구가 취소할 때 받는 Escape를 입력 칸에 보냅니다.
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const input = event.target;
    if (event.key !== "Enter" || !(input instanceof HTMLInputElement)) return;
    if (input.closest(".milkdown-link-edit")) confirm(event, input);
  };
  // 확인 단추는 click이 아니라 pointerdown에 반응합니다.
  const onPointerDown = (event: PointerEvent) => {
    const form = (event.target as Element).closest(".milkdown-link-edit");
    const input = form?.querySelector("input");
    if (input && (event.target as Element).closest(".confirm")) confirm(event, input);
  };

  root?.addEventListener("keydown", onKeyDown, true);
  root?.addEventListener("pointerdown", onPointerDown, true);
  return {
    destroy: () => {
      root?.removeEventListener("keydown", onKeyDown, true);
      root?.removeEventListener("pointerdown", onPointerDown, true);
    },
  };
}
