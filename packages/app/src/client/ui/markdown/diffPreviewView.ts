import type { Messages } from "@/client/modules/locale/domain/messages";
import {
  type DiffFile,
  type DiffLine,
  diffPreview,
} from "@/client/modules/markdown/domain/diffPreview";

type Labels = Messages["markdownEditor"];

const SIGNS: Record<DiffLine["kind"], string> = {
  context: " ",
  added: "+",
  deleted: "-",
  note: "",
};

/**
 * 펼친 .diff·.patch 내용을 파일마다 머리 막대(경로, 배지, 추가·삭제 수)와 줄 표(옛·새 줄 번호, 부호, 내용)로 그리고, 첫 파일 앞의 글과
 * 마지막 hunk 뒤의 글을 그 앞뒤에 둡니다. 파일 diff로 나눌 수 없으면 null을 돌려줍니다. 파일 내용은 textContent로만 넣습니다.
 */
export function diffPreviewView(text: string, labels: Labels): HTMLElement | null {
  const preview = diffPreview(text);
  if (!preview) return null;
  const view = diffView(preview.files, labels);
  const content = view.firstElementChild!;
  if (preview.before) content.prepend(element("pre", "file-preview-diff-text", preview.before));
  if (preview.after) content.append(element("pre", "file-preview-diff-text", preview.after));
  return view;
}

/**
 * 파일 diff들을 스크롤 영역 하나에 그립니다. fileId를 주면 파일마다 그 id를 붙여, 화면이 파일 위치로 스크롤해 갈 수 있게 합니다.
 * 한 문서에 diff 보기가 여럿일 수 있으므로 id는 부르는 쪽이 문서 안에서 겹치지 않게 정합니다.
 */
export function diffView(
  files: DiffFile[],
  labels: Labels,
  fileId?: (file: number) => string,
): HTMLElement {
  const content = element("div", "file-preview-diff-content");
  for (const [index, file] of files.entries()) {
    const view = fileView(file, labels);
    if (fileId) view.id = fileId(index);
    content.append(view);
  }
  const scroller = element("div", "file-preview-diff");
  // 키보드로도 넘친 내용을 스크롤할 수 있게 합니다.
  scroller.tabIndex = 0;
  // 파일마다 표가 따로 있으므로, 줄 번호 칸을 가장 큰 번호의 자릿수에 맞춰 모든 파일의 줄 내용이 같은 자리에서 시작하게 합니다.
  const largest = files
    .flatMap((file) => file.hunks.flatMap((hunk) => hunk.lines))
    .reduce((max, line) => Math.max(max, line.oldNumber ?? 0, line.newNumber ?? 0), 0);
  scroller.style.setProperty("--diff-number-digits", String(String(largest).length));
  scroller.append(content);
  return scroller;
}

/** diffView로 그린 보기를 감싼 요소에 붙이면, 긴 줄을 보이는 폭에 맞춰 줄바꿈하고 줄바꿈으로 생긴 줄마다 부호 칸에 표식을 그립니다. */
export const DIFF_WRAP_CLASS = "file-preview-diff-wrap";

function fileView(file: DiffFile, labels: Labels) {
  const header = element("div", "file-preview-diff-header");
  for (const badge of file.badges) {
    header.append(element("span", `file-preview-diff-badge ${badge}`, labels.diffBadges[badge]));
  }
  const path = element("span", "file-preview-diff-path");
  if (file.renamedFrom) {
    path.append(element("span", "file-preview-diff-path-from", `${file.renamedFrom} → `));
  }
  path.append(file.path ?? "");
  const counts = element("span", "file-preview-diff-counts");
  const shown = element("span");
  shown.setAttribute("aria-hidden", "true");
  shown.append(
    element("span", "added", `+${file.additions}`),
    " ",
    element("span", "deleted", `−${file.deletions}`),
  );
  counts.append(
    shown,
    element("span", "sr-only", labels.diffLineCounts(file.additions, file.deletions)),
  );
  header.append(path, counts);

  const view = element("div", "file-preview-diff-file");
  view.setAttribute("role", "group");
  if (file.path) view.setAttribute("aria-label", path.textContent);
  view.append(header);
  if (file.hunks.length > 0) {
    const table = element("table");
    for (const hunk of file.hunks) {
      table.append(row("hunk", "", "", "", [hunk.header]));
      for (const line of hunk.lines) {
        table.append(
          row(
            line.kind,
            String(line.oldNumber ?? ""),
            String(line.newNumber ?? ""),
            SIGNS[line.kind],
            line.words?.map((word) =>
              word.changed ? element("mark", null, word.text) : word.text,
            ) ?? [line.text],
          ),
        );
      }
    }
    view.append(table);
  }
  return view;
}

function row(
  kind: DiffLine["kind"] | "hunk",
  oldNumber: string,
  newNumber: string,
  sign: string,
  text: (string | Node)[],
) {
  const cells = [
    element("td", "number", oldNumber),
    element("td", "number", newNumber),
    element("td", "sign", sign),
    element("td", "text"),
  ];
  cells[3]!.append(...text);
  const tr = element("tr", kind);
  tr.append(...cells);
  return tr;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string | null,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
