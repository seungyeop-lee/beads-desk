import { LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { classHighlighter, highlightCode } from "@lezer/highlight";
import type { Mark, MarkType, Node as ProseNode } from "@milkdown/kit/prose/model";
import { type EditorState, Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet, type EditorView } from "@milkdown/kit/prose/view";
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
  /** 링크 글자입니다. 버튼과 내용 영역의 접근 가능한 이름에 씁니다. */
  name: string;
  /** 링크를 그릴 때와 같은 로컬 파일 API 주소입니다. */
  address: string;
  format: FilePreviewFormat;
};

/** 펼친 링크의 시작 위치 모음입니다. */
const expandedKey = new PluginKey<ReadonlySet<number>>("localFilePreview");

/**
 * 읽기 전용 본문에서 .diff·.patch·.log·.txt 로컬 파일 링크 옆에 펼치기 버튼을 두고, 누르면 링크가 든 블록 아래에
 * 파일 내용을 펼치는 plugin입니다. 버튼과 내용은 decoration으로 그려 문서와 markdown 원문을 바꾸지 않습니다.
 * `address`는 링크를 그릴 때와 같은 주소 함수로, 그 결과가 로컬 파일 API 주소인 링크만 대상입니다.
 */
export function localFilePreview(
  linkType: MarkType,
  address: (url: string) => string,
  labels: Labels,
): Plugin {
  const idPrefix = `file-preview-${crypto.randomUUID()}`;
  return new Plugin({
    key: expandedKey,
    state: {
      init: () => new Set<number>(),
      apply: (tr, expanded) => {
        if (tr.docChanged) return new Set<number>();
        const toggled: number | undefined = tr.getMeta(expandedKey);
        if (toggled === undefined) return expanded;
        const next = new Set(expanded);
        if (!next.delete(toggled)) next.add(toggled);
        return next;
      },
    },
    props: {
      decorations: (state) => {
        const expanded = expandedKey.getState(state)!;
        const links = previewLinks(state.doc, linkType, address);
        return DecorationSet.create(
          state.doc,
          links.flatMap((link, order) => {
            const id = `${idPrefix}-${link.from}`;
            const toggle = Decoration.widget(
              link.to,
              (view) => toggleButton(view, link, id, labels),
              {
                side: 1,
                marks: [],
                key: `toggle-${link.from}`,
                stopEvent: () => true,
                ignoreSelection: true,
              },
            );
            if (!expanded.has(link.from)) return [toggle];
            // 같은 블록 아래의 내용은 side 순서로 놓이므로, 링크 순서를 side로 줍니다.
            const contents = Decoration.widget(
              link.blockEnd,
              () => previewContents(link, id, labels),
              {
                side: order + 1,
                key: `contents-${link.from}`,
                stopEvent: () => true,
                ignoreSelection: true,
              },
            );
            return [toggle, contents];
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

/** 링크 뒤에 놓는 펼치기 버튼입니다. 펼친 상태는 plugin state에만 두고, 누를 때마다 그 값을 버튼에 옮겨 적습니다. */
function toggleButton(view: EditorView, link: PreviewLink, id: string, labels: Labels) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "file-preview-toggle";
  const label = labels.filePreview(link.name);
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-controls", id);
  const showExpanded = (state: EditorState) =>
    button.setAttribute("aria-expanded", String(expandedKey.getState(state)!.has(link.from)));
  showExpanded(view.state);
  button.append(chevronIcon());
  button.addEventListener("click", () => {
    view.dispatch(view.state.tr.setMeta(expandedKey, link.from));
    showExpanded(view.state);
  });
  return button;
}

/** designSystem/icons.tsx의 ChevronRightIcon과 같은 모양입니다. 펼치면 CSS가 아래로 돌립니다. */
function chevronIcon() {
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
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "m9 6 6 6-6 6");
  svg.append(path);
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
    open.textContent = labels.openFile;
    const view = message(`${labels.filePreviewTooLarge(FILE_PREVIEW_MAX_BYTES / 1024 / 1024)} `);
    view.append(open);
    return view;
  }
  const text = document.createElement("pre");
  // 키보드로도 넘친 내용을 스크롤할 수 있게 합니다.
  text.tabIndex = 0;
  if (link.format === "diff") text.append(await highlightedDiff(file.text).catch(() => file.text));
  else text.textContent = file.text;
  return text;
}

function message(text: string) {
  const paragraph = document.createElement("p");
  paragraph.className = "file-preview-message";
  paragraph.textContent = text;
  return paragraph;
}

/**
 * 코드 블록과 같은 @codemirror/language-data의 diff mode로 토큰을 나눠, 토큰마다 classHighlighter의 `tok-*` class를 붙입니다.
 * 색은 markdownEditor.css가 코드 블록 강조와 같은 --code-* 변수로 정합니다.
 */
async function highlightedDiff(text: string): Promise<DocumentFragment> {
  const diff = await LanguageDescription.matchLanguageName(languages, "diff")!.load();
  const fragment = document.createDocumentFragment();
  highlightCode(
    text,
    diff.language.parser.parse(text),
    classHighlighter,
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
