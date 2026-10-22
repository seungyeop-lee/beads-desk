import { type Language, LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { classHighlighter, highlightCode, tagHighlighter, tags } from "@lezer/highlight";
import {
  DOMSerializer,
  type Mark,
  type MarkType,
  type Node as ProseNode,
} from "@milkdown/kit/prose/model";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import {
  Decoration,
  DecorationSet,
  type EditorView,
  type MarkView,
} from "@milkdown/kit/prose/view";
import {
  type LocalTextFile,
  readLocalTextFile,
} from "@/client/infra/localFiles/localFileApiClient";
import type { Messages } from "@/client/modules/locale/domain/koMessages";
import {
  FILE_PREVIEW_MAX_BYTES,
  type FilePreviewFormat,
  filePreviewFormat,
} from "@/client/modules/markdown/domain/filePreview";

type Labels = Messages["markdownEditor"];

/** 본문에서 펼쳐 볼 수 있는 로컬 파일 링크입니다. */
type PreviewLink = {
  /** 링크가 시작하는 위치입니다. 읽기 전용 문서에서는 바뀌지 않으므로, 펼친 상태와 widget key에서 링크를 가리킵니다. */
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

/** 칩으로 그린 링크입니다. `name`은 링크 글자를 담는 contentDOM입니다. */
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
 */
export function localFilePreview(
  linkType: MarkType,
  address: (url: string) => string,
  labels: Labels,
): Plugin {
  const idPrefix = `file-preview-${crypto.randomUUID()}`;
  const contentsId = (link: PreviewLink) => `${idPrefix}-${link.from}`;
  const chips = new Set<Chip>();

  const linkOf = (view: EditorView, chip: Chip) => {
    const pos = view.posAtDOM(chip.name, 0);
    return previewKey.getState(view.state)!.links.find((link) => link.from <= pos && pos < link.to);
  };
  const toggle = (view: EditorView, chip: Chip) => {
    const link = linkOf(view, chip);
    if (link) view.dispatch(view.state.tr.setMeta(previewKey, link.from));
  };
  const showChips = (view: EditorView) => {
    const { expanded } = previewKey.getState(view.state)!;
    for (const chip of chips) {
      const link = linkOf(view, chip);
      if (!link) continue;
      chip.dom.setAttribute("aria-label", labels.filePreview(link.name));
      chip.dom.setAttribute("aria-controls", contentsId(link));
      chip.dom.setAttribute("aria-expanded", String(expanded.has(link.from)));
    }
  };
  const linkView = (mark: Mark, view: EditorView): MarkView => {
    const rendered = DOMSerializer.renderSpec(document, mark.type.spec.toDOM!(mark, true));
    const anchor = rendered.dom as HTMLElement;
    if (!filePreviewFormat(anchor.getAttribute("href") ?? "")) return { ...rendered, dom: anchor };
    const chip = chipView(anchor, () => toggle(view, chip));
    chips.add(chip);
    return {
      dom: chip.dom,
      contentDOM: chip.name,
      // showChips가 바꾼 속성을 ProseMirror가 문서 변경으로 읽지 않게 합니다.
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
          return { links: previewLinks(tr.doc, linkType, address), expanded: new Set<number>() };
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
 */
function chipView(anchor: HTMLElement, toggle: () => void): Chip {
  const name = document.createElement("span");
  anchor.replaceChildren(lineIcon("m9 6 6 6-6 6"), name);
  anchor.classList.add("file-preview-chip");
  anchor.setAttribute("role", "button");
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
  return { dom: anchor, name };
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

/**
 * classHighlighter에 더해, classHighlighter가 class를 붙이지 않는 토큰에도 class를 붙입니다. 취소선과 구분선은 코드 블록 강조
 * (codeHighlighting.ts)가 칠하는 토큰이고, monospace(인라인 코드와 코드 블록 글자)와 processingInstruction(#, -, *, `, > 같은
 * 표시 기호)은 markdown 원문에서 구분해 보이려는 토큰입니다.
 */
const previewHighlighters = [
  classHighlighter,
  tagHighlighter([
    { tag: tags.strikethrough, class: "tok-strikethrough" },
    { tag: tags.contentSeparator, class: "tok-contentSeparator" },
    { tag: tags.monospace, class: "tok-monospace" },
    { tag: tags.processingInstruction, class: "tok-processingInstruction" },
  ]),
];

/**
 * 원문을 형식의 language mode로 토큰으로 나눠, 토큰마다 `tok-*` class를 붙입니다.
 * 색은 markdownEditor.css가 코드 블록 강조와 같은 --code-* 변수로 정합니다.
 */
async function highlighted(
  text: string,
  format: Exclude<FilePreviewFormat, "plain">,
): Promise<DocumentFragment> {
  const mode = format === "diff" ? await diffMode() : await markdownMode(text);
  const fragment = document.createDocumentFragment();
  highlightCode(
    text,
    mode.parser.parse(text),
    previewHighlighters,
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
