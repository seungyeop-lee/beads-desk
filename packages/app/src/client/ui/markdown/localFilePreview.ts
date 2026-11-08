import type { Mark, MarkType, Node as ProseNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey, type Transaction } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet, type EditorView } from "@milkdown/kit/prose/view";
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
import { localFileLinkUrl } from "@/client/modules/markdown/domain/localMarkdownUrl";
import { highlightedFileText } from "./highlightedFileText";
import { jsonFileView } from "./jsonFileView";

type Labels = Messages["markdownEditor"];

/** 본문에서 펼쳐 볼 수 있는 로컬 파일 링크입니다. */
type PreviewLink = {
  /** 링크가 시작하는 위치입니다. 펼친 상태와 widget key에서 링크를 가리킵니다. */
  from: number;
  to: number;
  /** 링크가 든 블록(문단, 제목, 목록 항목의 글)이 끝나는 위치입니다. 펼친 내용은 이 위치에 놓습니다. */
  blockEnd: number;
  /** 링크 글자입니다. 펼치기 버튼과 내용 영역의 접근 가능한 이름에 씁니다. */
  name: string;
  /** 링크를 그릴 때와 같은 로컬 파일 API 주소입니다. 펼친 내용은 이 주소로 원문을 읽습니다. */
  address: string;
  format: FilePreviewFormat;
};

type PreviewState = {
  links: PreviewLink[];
  /** 펼친 링크의 시작 위치 모음입니다. */
  expanded: ReadonlySet<number>;
};

const previewKey = new PluginKey<PreviewState>("localFilePreview");

/**
 * 읽기 전용 본문에서 펼쳐 볼 수 있는 로컬 파일 링크(filePreview.ts) 바로 뒤에 펼치기 버튼을 두고, 버튼을 누르면 링크가 든 블록
 * 아래에 파일 내용을 펼치는 plugin입니다. 링크 자체는 평범한 링크로 남아, 누르면 링크 주소(milkdownAdapter.ts의 link toDOM)를 엽니다.
 * 버튼과 내용은 decoration으로 그려 문서와 markdown 원문을 바꾸지 않습니다.
 * `address`는 링크를 그릴 때와 같은 주소 함수로, 그 결과가 로컬 파일 API 주소인 링크만 대상입니다.
 *
 * 링크 글자 일부에만 굵게 같은 다른 서식이 있어 링크가 `<a>` 여러 개로 그려져도, 버튼은 링크 범위의 끝에 하나만 둡니다.
 * 버튼은 링크 위치가 같으면 다시 만들지 않으므로, 누른 뒤에도 focus가 버튼에 남습니다. 그래서 펼친 상태와 이름은 plugin view가
 * 상태가 바뀔 때마다 버튼에 다시 적습니다.
 */
export function localFilePreview(
  linkType: MarkType,
  address: (url: string) => string,
  labels: Labels,
): Plugin {
  const idPrefix = `file-preview-${crypto.randomUUID()}`;
  const contentsId = (from: number) => `${idPrefix}-${from}`;
  /** 화면에 있는 펼치기 버튼과 그 버튼이 펼치는 링크의 시작 위치입니다. */
  const toggles = new Map<HTMLButtonElement, number>();

  const showToggle = (button: HTMLButtonElement, from: number, state: PreviewState) => {
    const link = state.links.find((link) => link.from === from);
    if (!link) return;
    button.setAttribute("aria-label", labels.filePreview(link.name));
    button.setAttribute("aria-expanded", String(state.expanded.has(from)));
  };
  const showToggles = (view: EditorView) => {
    const state = previewKey.getState(view.state)!;
    for (const [button, from] of toggles) showToggle(button, from, state);
  };
  const toggleButton = (view: EditorView, from: number) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "file-preview-toggle";
    button.setAttribute("aria-controls", contentsId(from));
    button.append(lineIcon("m9 6 6 6-6 6"));
    button.addEventListener("click", () => view.dispatch(view.state.tr.setMeta(previewKey, from)));
    toggles.set(button, from);
    showToggle(button, from, previewKey.getState(view.state)!);
    return button;
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
    view: () => ({ update: showToggles }),
    props: {
      decorations: (state) => {
        const { links, expanded } = previewKey.getState(state)!;
        return DecorationSet.create(
          state.doc,
          links.flatMap((link, order) => {
            const toggle = Decoration.widget(link.to, (view) => toggleButton(view, link.from), {
              side: 1,
              marks: [],
              key: `toggle-${link.from}`,
              stopEvent: () => true,
              ignoreSelection: true,
              destroy: (button) => toggles.delete(button as HTMLButtonElement),
            });
            if (!expanded.has(link.from)) return [toggle];
            // 같은 블록 아래의 내용은 side 순서로 놓이므로, 링크 순서를 side로 줍니다.
            const contents = Decoration.widget(
              link.blockEnd,
              () => previewContents(link, contentsId(link.from), labels),
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

/**
 * 문서가 바뀐 뒤에도 펼친 채로 둘 링크의 시작 위치입니다. 펼친 링크의 시작 위치를 변경에 맞춰 옮기고, 옮긴 위치에서 같은 주소의
 * 링크가 시작할 때만 남겨, 지우거나 주소를 바꾼 링크는 접습니다.
 *
 * 읽기 전용 본문에서도 문서는 바뀝니다. Crepe가 붙이는 trailing plugin은 코드 블록이나 표로 끝나는 문서에 첫 transaction 뒤
 * 빈 문단을 덧붙이므로, 처음 펼치기 버튼을 눌러 펼친 transaction 바로 뒤에도 문서가 바뀝니다.
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

/** designSystem/icons.tsx의 아이콘과 같은 선 모양(lucide, stroke 2)의 아이콘입니다. */
function lineIcon(...paths: string[]) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [name, value] of Object.entries({
    viewBox: "0 0 24 24",
    // 크기 속성이 없으면 내용 크기로 줄어드는 버튼 안에서 너비가 0이 됩니다. 실제 크기는 markdownEditor.css가 정합니다.
    width: "14",
    height: "14",
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
    open.href = localFileLinkUrl(link.address);
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
  if (link.format === "json" || link.format === "jsonl")
    return jsonFileView(file.text, link.format, labels);
  const text = document.createElement("pre");
  // 키보드로도 넘친 내용을 스크롤할 수 있게 합니다.
  text.tabIndex = 0;
  if (link.format === "plain") text.textContent = file.text;
  else text.append(await highlightedFileText(file.text, link.format).catch(() => file.text));
  return text;
}

function message(text: string) {
  const paragraph = document.createElement("p");
  paragraph.className = "file-preview-message";
  paragraph.textContent = text;
  return paragraph;
}
