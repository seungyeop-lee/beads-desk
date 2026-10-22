import type { Ctx } from "@milkdown/kit/ctx";
import type { MarkType, Node as ProseNode } from "@milkdown/kit/prose/model";
import type { EditorState, PluginView } from "@milkdown/kit/prose/state";
import type { DirectEditorProps, EditorView } from "@milkdown/kit/prose/view";
import { WINDOWS_DRIVE_PATH } from "@/client/modules/markdown/domain/drivePath";
import { opensInNewTab } from "@/client/modules/markdown/domain/localMarkdownUrl";
import {
  sourceUrlOf,
  windowsPath,
  windowsPathHandlers,
} from "@/client/modules/markdown/domain/windowsPathSource";

type Commonmark = typeof import("@milkdown/kit/preset/commonmark");
type Core = typeof import("@milkdown/kit/core");

/** 편집기 밖에서 정한 주소 정책으로, markdown 본문의 주소를 브라우저에서 여는 주소로 바꿉니다. */
type OpenAddress = (url: string) => string;

/**
 * 링크 href와 그림 src로 여는 주소를 만듭니다. Milkdown은 http, https, mailto 같은 허용 scheme 밖의 href를
 * `sanitizeLinkHref`로 비웁니다. `C:/a.md`처럼 드라이브 문자가 scheme으로 읽히는 Windows 경로도 비워지므로,
 * 앱 안 주소로 바뀌는 주소는 원래 값에서 바꾸고 바뀌지 않는 주소만 Milkdown과 같은 방식으로 거릅니다.
 * 그림의 src는 Milkdown 기본 image schema가 scheme을 검사하지 않지만, 링크의 href와 같은 기준으로 거릅니다.
 */
export function milkdownAddress(
  commonmark: Commonmark,
  openAddress: OpenAddress,
): (url: string) => string {
  return (url) => {
    const opened = openAddress(url);
    return opened === url ? commonmark.sanitizeLinkHref(url) : opened;
  };
}

/**
 * Milkdown 링크 도구에 Windows 드라이브 경로(`C:\a.md`, `C:/a.md`)를 넣고 확인해도 그 경로의 링크가 되게 하는 plugin view입니다.
 *
 * 링크 도구는 확인한 주소를 `sanitizeLinkHref`로 거르는데, 이 함수는 드라이브 문자 `C:`를 허용하지 않는 scheme으로 읽어
 * 주소를 비웁니다. 걸러 내는 동작을 바꿀 설정이 없으므로, 확인하려는 주소가 드라이브 경로일 때만 링크 도구보다 먼저 확인
 * 입력을 받아 Milkdown과 같은 방식으로 링크를 넣습니다. 드라이브 경로가 아닌 주소는 링크 도구가 그대로 걸러서
 * `javascript:` 같은 scheme은 계속 비워집니다. 링크를 그릴 때는 드라이브 경로를 로컬 파일 API 주소로 바꾸므로(`openAddress`)
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

/**
 * link와 image의 schema를 Windows 경로 원문 주소를 보존하는 runner로 덮어쓰는 editor 설정입니다.
 *
 * link의 href와 image의 src에는 원문에서 되살린 경로를 둡니다. Milkdown 링크 도구는 href만 읽어 미리 보여 주고
 * 복사하고 수정 칸에 채우므로, 파싱한 주소를 두면 `C:\work\.beads`가 `C:\work.beads`로 보입니다.
 * 링크는 로컬 파일과 외부 주소만 새 탭에서 엽니다(`opensInNewTab`).
 * sourceUrl은 remarkWindowsPathSource가 남긴 원문 주소로, 저장할 markdown에 원문 주소를 쓸 때만 쓰고 HTML 속성으로는
 * 내보내지 않습니다(null인 속성은 DOM에 붙지 않습니다).
 * 아래 parseMarkdown과 toMarkdown runner는 Milkdown 기본 runner에서 주소를 되살린 경로로 바꾸고 sourceUrl을 더한
 * 것이므로, Milkdown을 올리면 기본 runner와 비교합니다.
 */
export function windowsPathAddressConfig(
  commonmark: Commonmark,
  core: Core,
  address: (url: string) => string,
): (ctx: Ctx) => void {
  const sourceUrl = { default: null, validate: "string|null" };
  return (ctx) => {
    ctx.update(commonmark.linkSchema.key, (previous) => (schemaCtx) => {
      const schema = previous(schemaCtx);
      return {
        ...schema,
        attrs: { ...schema.attrs, sourceUrl },
        parseMarkdown: {
          ...schema.parseMarkdown,
          runner: (state, node, markType) => {
            const source = sourceUrlOf(node);
            state.openMark(markType, {
              href: windowsPath(node.url as string, source),
              title: node.title,
              sourceUrl: source,
            });
            state.next(node.children);
            state.closeMark(markType);
          },
        },
        toDOM: (mark) => {
          const dom = schema.toDOM!(mark, false) as [string, Record<string, unknown>];
          const href = address(String(mark.attrs.href));
          const target = opensInNewTab(href) ? "_blank" : null;
          return [dom[0], { ...dom[1], href, target, sourceUrl: null }];
        },
        toMarkdown: {
          ...schema.toMarkdown,
          runner: (state, mark) => {
            state.withMark(mark, "link", undefined, {
              title: mark.attrs.title,
              url: mark.attrs.href,
              data: { sourceUrl: mark.attrs.sourceUrl },
            });
          },
        },
      };
    });
    ctx.update(commonmark.imageSchema.key, (previous) => (schemaCtx) => {
      const schema = previous(schemaCtx);
      return {
        ...schema,
        attrs: { ...schema.attrs, sourceUrl },
        parseMarkdown: {
          ...schema.parseMarkdown,
          runner: (state, node, type) => {
            const source = sourceUrlOf(node);
            state.addNode(type, {
              src: windowsPath(node.url as string, source),
              alt: node.alt ?? "",
              title: node.title ?? "",
              sourceUrl: source,
            });
          },
        },
        toDOM: (node) => ["img", { ...node.attrs, src: address(node.attrs.src), sourceUrl: null }],
        toMarkdown: {
          ...schema.toMarkdown,
          runner: (state, node) => {
            state.addNode("image", undefined, undefined, {
              title: node.attrs.title,
              url: node.attrs.src,
              alt: node.attrs.alt,
              data: { sourceUrl: node.attrs.sourceUrl },
            });
          },
        },
      };
    });
    ctx.update(core.remarkStringifyOptionsCtx, (options) => ({
      ...options,
      handlers: { ...options.handlers, ...windowsPathHandlers },
    }));
  };
}

/**
 * 편집기에 붙일 이미지 파일 거부 정책입니다. 이미지 파일을 올릴 곳이 없습니다. Milkdown upload plugin은 blob: 주소를
 * 본문에 넣어 새로고침하면 깨지므로, 그 plugin이 처리할 붙여 넣기와 끌어 놓기를 먼저 받아 버립니다.
 */
export const refuseFileUpload: Pick<DirectEditorProps, "handlePaste" | "handleDrop"> = {
  handlePaste: (_view, event) =>
    Boolean(event.clipboardData?.files.length) && !event.clipboardData?.getData("text/html"),
  handleDrop: (_view, event) => Boolean(event.dataTransfer?.files.length),
};

/**
 * 본문과 커서가 바뀔 때마다 React에 알리는 plugin view의 update 처리기입니다.
 * `getMarkdown`은 편집기 문서를 markdown으로 직렬화합니다.
 */
export function contentUpdateView(
  getMarkdown: (doc: ProseNode) => string,
  onChanged: (markdown: string) => void,
  onCursorMoved: (headingLevel: number) => void,
): NonNullable<PluginView["update"]> {
  return (view: EditorView, previous: EditorState) => {
    const block = view.state.selection.$from.parent;
    onCursorMoved(block.type.name === "heading" ? Number(block.attrs.level) : 0);
    if (view.state.doc.eq(previous.doc)) return;
    // 직렬화 결과 끝에 붙는 줄바꿈은 빼고, textarea로 입력하던 때처럼 입력한 글자만 넘깁니다.
    onChanged(getMarkdown(view.state.doc).replace(/\n$/, ""));
  };
}
