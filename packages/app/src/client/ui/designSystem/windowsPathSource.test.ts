import { toMarkdown } from "mdast-util-to-markdown";
import remarkInlineLinks from "remark-inline-links";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { expect, test } from "vitest";
import {
  remarkWindowsPathSource,
  sourceUrlOf,
  windowsPath,
  windowsPathHandlers,
} from "./windowsPathSource";

type Destination = { type: string; url?: string; data?: unknown };

/** markdown을 편집기처럼 파싱해, link와 image node마다 그릴 때 쓰는 경로를 구합니다. */
function openedPaths(markdown: string): string[] {
  const processor = unified().use(remarkParse).use(remarkInlineLinks).use(remarkWindowsPathSource);
  const tree = processor.runSync(processor.parse(markdown), markdown);
  const paths: string[] = [];
  const visit = (node: Destination & { children?: Destination[] }) => {
    if (node.type === "link" || node.type === "image") {
      paths.push(windowsPath(node.url!, sourceUrlOf(node)));
    }
    node.children?.forEach(visit);
  };
  visit(tree);
  return paths;
}

test.each([
  ["[a](C:\\work\\.beads\\a.md)", "C:\\work\\.beads\\a.md"],
  ["[a](C:\\a_b\\_x.md)", "C:\\a_b\\_x.md"],
  ['[a](<D:\\작업 트리\\-x\\(1).md> "제목")', "D:\\작업 트리\\-x\\(1).md"],
  ["![그림](C:\\work\\.beads\\a.png)", "C:\\work\\.beads\\a.png"],
  ["[\\](C:\\x](C:\\y\\.md)", "C:\\y\\.md"],
  ["[a][r]\n\n[r]: C:\\work\\.beads\\a.md", "C:\\work\\.beads\\a.md"],
  ["![그림][r]\n\n[r]:\n  C:\\a_b\\_x.png", "C:\\a_b\\_x.png"],
  ['[a][r]\n\n[r]: <D:\\작업 트리\\-x\\(1).md> "제목"', "D:\\작업 트리\\-x\\(1).md"],
])("역슬래시 드라이브 경로는 escape로 지워진 `\\`를 살린다: %s", (markdown, path) => {
  expect(openedPaths(markdown)).toEqual([path]);
});

test.each([
  ["[a](C:\\\\work\\\\.beads\\\\a.md)", "C:\\work\\.beads\\a.md"],
  ["[a](C:\\Users\\me\\a.md)", "C:\\Users\\me\\a.md"],
  ["[a](C:/work/\\_a.md)", "C:/work/_a.md"],
  ["[a](/tmp/\\_a.md)", "/tmp/_a.md"],
  ["[a](https://example.com/\\_a)", "https://example.com/_a"],
])("그 밖의 주소는 파싱한 주소를 그대로 쓴다: %s", (markdown, path) => {
  expect(openedPaths(markdown)).toEqual([path]);
});

test("원문 주소를 파싱한 결과가 지금 주소와 다르면, 고친 주소로 보고 지금 주소를 쓴다", () => {
  expect(windowsPath("C:\\other.md", "C:\\work\\.beads\\a.md")).toBe("C:\\other.md");
  expect(windowsPath("C:\\work.beads\\a.md", "C:\\work\\.beads\\a.md")).toBe(
    "C:\\work\\.beads\\a.md",
  );
});

function linkMarkdown(url: string, sourceUrl?: string) {
  return toMarkdown(
    {
      type: "paragraph",
      children: [
        { type: "link", url, data: { sourceUrl }, children: [{ type: "text", value: "a" }] },
      ],
    },
    { handlers: windowsPathHandlers },
  ).trimEnd();
}

test.each([
  ["C:\\work\\.beads\\a.md", "C:\\work\\.beads\\a.md", "[a](C:\\work\\.beads\\a.md)"],
  ["d:\\work\\.x\\조사 결과.md", "d:\\work\\.x\\조사 결과.md", "[a](<d:\\work\\.x\\조사 결과.md>)"],
  ["C:\\work\\.beads\\a.md", "C:\\work\\\\.beads\\a.md", "[a](C:\\work\\\\.beads\\a.md)"],
])("원문 주소가 가리키는 경로가 지금 주소이면 원문 주소를 쓴다: %s", (url, sourceUrl, markdown) => {
  expect(linkMarkdown(url, sourceUrl)).toBe(markdown);
});

test.each([
  ["원문 주소가 없으면", "C:/x/y.md", undefined, "[a](C:/x/y.md)"],
  [
    "편집기에서 주소를 고쳐 원문 주소가 가리키는 경로가 지금 주소와 다르면",
    "docs/b.md",
    "C:\\work\\.beads\\a.md",
    "[a](docs/b.md)",
  ],
  [
    "원문 주소를 괄호 없는 주소로 쓸 수 없으면",
    "C:\\x\\.y(b.md",
    "C:\\x\\.y(b.md",
    "[a](C:\\x\\\\.y\\(b.md)",
  ],
])("%s 지금 주소를 escape해서 쓴다", (_, url, sourceUrl, markdown) => {
  expect(linkMarkdown(url, sourceUrl)).toBe(markdown);
});
