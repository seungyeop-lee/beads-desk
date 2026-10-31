import { type Language, LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { highlightCode } from "@lezer/highlight";
import {
  DOMSerializer,
  type Mark,
  type MarkType,
  type Node as ProseNode,
} from "@milkdown/kit/prose/model";
import { Plugin, PluginKey, type Transaction } from "@milkdown/kit/prose/state";
import {
  Decoration,
  DecorationSet,
  type EditorView,
  type MarkView,
} from "@milkdown/kit/prose/view";
import { StyleModule } from "style-mod";
import {
  type LocalTextFile,
  readLocalTextFile,
} from "@/client/infra/localFiles/localFileApiClient";
import type { Messages } from "@/client/modules/locale/domain/messages";
import {
  FILE_PREVIEW_MAX_BYTES,
  type FilePreviewFormat,
  filePreviewFormat,
} from "@/client/modules/markdown/domain/filePreview";
import { filePreviewHighlightStyle } from "./codeHighlighting";

type Labels = Messages["markdownEditor"];

/** 본문에서 펼쳐 볼 수 있는 로컬 파일 링크입니다. */
type PreviewLink = {
  /** 링크가 시작하는 위치입니다. 펼친 상태와 widget key에서 링크를 가리킵니다. */
  from: number;
  to: number;
  /** 링크가 든 블록(문단, 제목, 목록 항목의 글)이 끝나는 위치입니다. 펼친 내용은 이 위치에 놓습니다. */
  blockEnd: number;
  /** 링크 글자입니다. 칩, 아이콘 링크, 내용 영역의 접근 가능한 이름에 씁니다. */
  name: string;
  /** 링크를 그릴 때와 같은 로컬 파일 API 주소입니다. */
  address: string;
  format: FilePreviewFormat;
};

type PreviewState = {
  links: PreviewLink[];
  /** 펼친 링크의 시작 위치 모음입니다. */
  expanded: ReadonlySet<number>;
};

/** 칩으로 그린 링크 `<a>`입니다. 링크 하나가 이 조각 여럿일 수 있습니다. `name`은 링크 글자를 담는 contentDOM입니다. */
type Chip = { dom: HTMLElement; name: HTMLElement };

const previewKey = new PluginKey<PreviewState>("localFilePreview");

/**
 * 읽기 전용 본문에서 펼쳐 볼 수 있는 로컬 파일 링크(filePreview.ts)를 펼치기 칩으로 그리고, 칩을 누르면 링크가 든 블록 아래에
 * 파일 내용을 펼치는 plugin입니다. 칩 오른쪽에는 파일을 새 탭에서 여는 아이콘 링크를 둡니다.
 * 칩은 링크 mark view로, 아이콘 링크와 내용은 decoration으로 그려 문서와 markdown 원문을 바꾸지 않습니다.
 * `address`는 링크를 그릴 때와 같은 주소 함수로, 그 결과가 로컬 파일 API 주소인 링크만 대상입니다.
 *
 * 칩은 `<a>`로 그려 Cmd/Ctrl 클릭과 가운데 버튼 클릭이 브라우저 기본 동작대로 새 탭을 엽니다.
 * mark view는 문서 위치를 모르므로, 칩의 접근 가능한 이름과 펼친 상태는 plugin view가 칩의 위치로 링크를 찾아 적습니다.
 * 링크 글자 일부에만 굵게 같은 다른 서식이 있으면 ProseMirror가 링크를 `<a>` 여러 개로 나눠 그립니다. 그때는 첫 조각만 button으로
 * 두고 나머지 조각은 그 칩이 이어지는 모양으로 그려, 링크 하나가 칩 하나로 보이게 합니다.
 */
export function localFilePreview(
  linkType: MarkType,
  address: (url: string) => string,
  labels: Labels,
): Plugin {
  const idPrefix = `file-preview-${crypto.randomUUID()}`;
  const contentsId = (link: PreviewLink) => `${idPrefix}-${link.from}`;
  const chips = new Set<Chip>();

  /** 칩 조각이 그리는 링크와, 그 조각이 링크의 첫 조각인지와 마지막 조각인지를 돌려줍니다. */
  const pieceOf = (view: EditorView, chip: Chip) => {
    const from = view.posAtDOM(chip.name, 0);
    const to = view.posAtDOM(chip.name, chip.name.childNodes.length);
    const link = previewKey
      .getState(view.state)!
      .links.find((link) => link.from <= from && from < link.to);
    return link && { link, first: from === link.from, last: to === link.to };
  };
  const piecesOf = (view: EditorView, link: PreviewLink) =>
    [...chips].filter((chip) => pieceOf(view, chip)?.link === link);
  const toggle = (view: EditorView, chip: Chip) => {
    const piece = pieceOf(view, chip);
    if (!piece) return;
    view.dispatch(view.state.tr.setMeta(previewKey, piece.link.from));
    // 첫 조각이 아닌 조각은 접근성 트리에서 숨겼으므로, 눌러서 받은 focus를 칩(첫 조각)으로 옮깁니다.
    if (!piece.first) {
      piecesOf(view, piece.link)
        .find((other) => pieceOf(view, other)!.first)
        ?.dom.focus();
    }
  };
  /** 링크가 여러 조각이면 한 조각에 pointer를 올려도 칩 전체가 hover 모양이 되게 합니다. */
  const hover = (view: EditorView, chip: Chip, hovered: boolean) => {
    const link = pieceOf(view, chip)?.link;
    if (!link) return;
    for (const piece of piecesOf(view, link)) {
      piece.dom.classList.toggle("file-preview-chip-hover", hovered);
    }
  };
  const showChips = (view: EditorView) => {
    const { expanded } = previewKey.getState(view.state)!;
    for (const chip of chips) {
      const piece = pieceOf(view, chip);
      if (!piece) continue;
      const { link, first, last } = piece;
      chip.dom.classList.toggle("file-preview-chip-continued", !first);
      chip.dom.classList.toggle("file-preview-chip-continues", !last);
      setAttributes(
        chip.dom,
        first
          ? {
              role: "button",
              "aria-label": labels.filePreview(link.name),
              "aria-controls": contentsId(link),
              "aria-expanded": String(expanded.has(link.from)),
              "aria-hidden": null,
              tabindex: null,
            }
          : {
              role: null,
              "aria-label": null,
              "aria-controls": null,
              "aria-expanded": null,
              "aria-hidden": "true",
              tabindex: "-1",
            },
      );
    }
  };
  const linkView = (mark: Mark, view: EditorView): MarkView => {
    const rendered = DOMSerializer.renderSpec(document, mark.type.spec.toDOM!(mark, true));
    const anchor = rendered.dom as HTMLElement;
    if (!filePreviewFormat(anchor.getAttribute("href") ?? "")) return { ...rendered, dom: anchor };
    const chip = chipView(
      anchor,
      () => toggle(view, chip),
      (hovered) => hover(view, chip, hovered),
    );
    chips.add(chip);
    return {
      dom: chip.dom,
      contentDOM: chip.name,
      // showChips와 hover가 바꾼 속성을 ProseMirror가 문서 변경으로 읽지 않게 합니다.
      ignoreMutation: (mutation) => mutation.type === "attributes",
      destroy: () => chips.delete(chip),
    };
  };

  return new Plugin({
    key: previewKey,
    state: {
      init: (_config, state) => ({
        links: previewLinks(state.doc, linkType, address),
        expanded: new Set<number>(),
      }),
      apply: (tr, previous) => {
        if (tr.docChanged) {
          const links = previewLinks(tr.doc, linkType, address);
          return { links, expanded: keptExpanded(tr, previous, links) };
        }
        const toggled: number | undefined = tr.getMeta(previewKey);
        if (toggled === undefined) return previous;
        const expanded = new Set(previous.expanded);
        if (!expanded.delete(toggled)) expanded.add(toggled);
        return { ...previous, expanded };
      },
    },
    view: (view) => {
      showChips(view);
      return { update: showChips };
    },
    props: {
      markViews: { [linkType.name]: linkView },
      decorations: (state) => {
        const { links, expanded } = previewKey.getState(state)!;
        return DecorationSet.create(
          state.doc,
          links.flatMap((link, order) => {
            const open = Decoration.widget(link.to, () => openLink(link, labels), {
              side: 1,
              marks: [],
              key: `open-${link.from}`,
              stopEvent: () => true,
              ignoreSelection: true,
            });
            if (!expanded.has(link.from)) return [open];
            // 같은 블록 아래의 내용은 side 순서로 놓이므로, 링크 순서를 side로 줍니다.
            const contents = Decoration.widget(
              link.blockEnd,
              () => previewContents(link, contentsId(link), labels),
              {
                side: order + 1,
                key: `contents-${link.from}`,
                stopEvent: () => true,
                ignoreSelection: true,
              },
            );
            return [open, contents];
          }),
        );
      },
    },
  });
}

/**
 * 문서가 바뀐 뒤에도 펼친 채로 둘 링크의 시작 위치입니다. 펼친 링크의 시작 위치를 변경에 맞춰 옮기고, 옮긴 위치에서 같은 주소의
 * 링크가 시작할 때만 남겨, 지우거나 주소를 바꾼 링크는 접습니다.
 *
 * 읽기 전용 본문에서도 문서는 바뀝니다. Crepe가 붙이는 trailing plugin은 코드 블록이나 표로 끝나는 문서에 첫 transaction 뒤
 * 빈 문단을 덧붙이므로, 처음 칩을 눌러 펼친 transaction 바로 뒤에도 문서가 바뀝니다.
 */
function keptExpanded(tr: Transaction, previous: PreviewState, links: PreviewLink[]): Set<number> {
  const kept = new Set<number>();
  for (const link of previous.links) {
    if (!previous.expanded.has(link.from)) continue;
    const { pos, deleted } = tr.mapping.mapResult(link.from);
    if (deleted) continue;
    if (links.some((next) => next.from === pos && next.address === link.address)) kept.add(pos);
  }
  return kept;
}

function previewLinks(
  doc: ProseNode,
  linkType: MarkType,
  address: (url: string) => string,
): PreviewLink[] {
  const links: PreviewLink[] = [];
  doc.descendants((block, blockPos) => {
    if (!block.isTextblock) return true;
    const blockEnd = blockPos + block.nodeSize;
    for (const range of linkRanges(block, blockPos + 1, linkType)) {
      const opened = address(String(range.mark.attrs.href));
      const format = filePreviewFormat(opened);
      if (format) links.push({ ...range, blockEnd, address: opened, format });
    }
    return false;
  });
  return links;
}

/**
 * 글 블록 안의 링크 범위를 앞에서부터 돌려줍니다. 링크 안에 굵게 같은 다른 mark가 섞이면 링크 하나가 text node 여럿으로
 * 나뉘므로, 같은 링크 mark가 이어지는 범위를 링크 하나로 묶습니다.
 */
function linkRanges(block: ProseNode, start: number, linkType: MarkType) {
  const ranges: { mark: Mark; from: number; to: number; name: string }[] = [];
  block.forEach((child, offset) => {
    const mark = linkType.isInSet(child.marks);
    if (!mark) return;
    const from = start + offset;
    const last = ranges.at(-1);
    if (last?.to === from && last.mark.eq(mark)) {
      last.to += child.nodeSize;
      last.name += child.textContent;
    } else {
      ranges.push({ mark, from, to: from + child.nodeSize, name: child.textContent });
    }
  });
  return ranges;
}

/**
 * 링크 `<a>`를 chevron과 링크 글자를 묶은 칩으로 바꿉니다. 수정 키 없이 누르거나 Enter·Space를 누르면 링크로 이동하지 않고
 * `toggle`을 부릅니다. Enter는 `<a>`가 click으로 바꿔 보내므로 Space만 따로 받습니다.
 * role과 접근 가능한 이름은 그 조각이 링크의 첫 조각인지 알아야 정할 수 있으므로 plugin view가 적습니다.
 */
function chipView(
  anchor: HTMLElement,
  toggle: () => void,
  hover: (hovered: boolean) => void,
): Chip {
  const name = document.createElement("span");
  anchor.replaceChildren(lineIcon("m9 6 6 6-6 6"), name);
  anchor.classList.add("file-preview-chip");
  anchor.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    toggle();
  });
  anchor.addEventListener("keydown", (event) => {
    if (event.key !== " ") return;
    event.preventDefault();
    toggle();
  });
  anchor.addEventListener("pointerenter", () => hover(true));
  anchor.addEventListener("pointerleave", () => hover(false));
  return { dom: anchor, name };
}

/** 값이 null인 속성은 지웁니다. */
function setAttributes(element: Element, attributes: Record<string, string | null>) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
}

/** 칩 오른쪽에 두어 파일을 새 탭에서 여는 아이콘 링크입니다. */
function openLink(link: PreviewLink, labels: Labels) {
  const anchor = document.createElement("a");
  anchor.href = link.address;
  anchor.target = "_blank";
  anchor.className = "file-preview-open";
  const label = labels.openInNewTab(link.name);
  anchor.title = label;
  anchor.setAttribute("aria-label", label);
  anchor.append(
    lineIcon(
      "M15 3h6v6",
      "M10 14 21 3",
      "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
    ),
  );
  return anchor;
}

/** designSystem/icons.tsx의 아이콘과 같은 선 모양(lucide, stroke 2)의 아이콘입니다. */
function lineIcon(...paths: string[]) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [name, value] of Object.entries({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  })) {
    svg.setAttribute(name, value);
  }
  for (const d of paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

/** 펼친 내용 영역입니다. 펼칠 때마다 파일을 새로 받아 옵니다. */
function previewContents(link: PreviewLink, id: string, labels: Labels) {
  const region = document.createElement("div");
  region.id = id;
  region.className = "file-preview";
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", labels.filePreviewContents(link.name));
  region.append(message(labels.filePreviewLoading));
  void readLocalTextFile(link.address, FILE_PREVIEW_MAX_BYTES)
    .then((file) => fileView(file, link, labels))
    .then((view) => region.replaceChildren(view));
  return region;
}

/** 파일 내용은 textContent로만 넣어, HTML이나 스크립트가 든 파일도 글자로 보입니다. */
async function fileView(file: LocalTextFile, link: PreviewLink, labels: Labels): Promise<Node> {
  if (file.status === "failed") return message(file.error);
  if (file.status === "tooLarge") {
    const open = document.createElement("a");
    open.href = link.address;
    open.target = "_blank";
    open.textContent = labels.openFile;
    const view = message(`${labels.filePreviewTooLarge(FILE_PREVIEW_MAX_BYTES / 1024 / 1024)} `);
    view.append(open);
    return view;
  }
  // 파일 diff로 나눌 수 없는 diff는 아래에서 줄의 부호에 따라 글자색만 입힌 원문으로 보입니다.
  if (link.format === "diff") {
    const diff = await import("./diffPreviewView")
      .then(({ diffPreviewView }) => diffPreviewView(file.text, labels))
      .catch(() => null);
    if (diff) return diff;
  }
  const text = document.createElement("pre");
  // 키보드로도 넘친 내용을 스크롤할 수 있게 합니다.
  text.tabIndex = 0;
  if (link.format === "plain") text.textContent = file.text;
  else text.append(await highlighted(file.text, link.format).catch(() => file.text));
  return text;
}

function message(text: string) {
  const paragraph = document.createElement("p");
  paragraph.className = "file-preview-message";
  paragraph.textContent = text;
  return paragraph;
}

/** 원문을 형식의 language mode로 토큰으로 나눠, 토큰마다 코드 블록과 같은 강조 규칙(codeHighlighting.ts)의 class를 붙입니다. */
async function highlighted(
  text: string,
  format: Exclude<FilePreviewFormat, "plain">,
): Promise<DocumentFragment> {
  const mode = format === "diff" ? await diffMode() : await markdownMode(text);
  StyleModule.mount(document, filePreviewHighlightStyle.module!);
  const fragment = document.createDocumentFragment();
  highlightCode(
    text,
    mode.parser.parse(text),
    filePreviewHighlightStyle,
    (part, classes) => {
      if (!classes) return fragment.append(part);
      const token = document.createElement("span");
      token.className = classes;
      token.textContent = part;
      fragment.append(token);
    },
    () => fragment.append("\n"),
  );
  return fragment;
}

/** 코드 블록과 같은 @codemirror/language-data의 diff mode입니다. */
async function diffMode(): Promise<Language> {
  const diff = await LanguageDescription.matchLanguageName(languages, "diff")!.load();
  return diff.language;
}

/**
 * GFM markdown mode입니다. 코드 블록(```ts 등)은 본문 코드 블록처럼 @codemirror/language-data의 그 언어 mode로 나눕니다.
 * 언어 mode는 불러오기 전에는 그 코드 블록을 나누지 않고 건너뛰므로, 원문을 한 번 나눠 코드 블록이 쓰는 언어를 모두 불러온 뒤에 돌려줍니다.
 */
async function markdownMode(text: string): Promise<Language> {
  const { markdown, markdownLanguage } = await import("@codemirror/lang-markdown");
  const used = new Set<LanguageDescription>();
  const { language } = markdown({
    base: markdownLanguage,
    codeLanguages: (info) => {
      const description = LanguageDescription.matchLanguageName(languages, info, true);
      if (description) used.add(description);
      return description;
    },
  });
  language.parser.parse(text);
  await Promise.allSettled([...used].map((description) => description.load()));
  return language;
}
