import { expect, test } from "vitest";
import { keepUnchangedBlocks } from "./keepUnchangedBlocks";

const ORIGINAL = [
  "## 배경",
  "",
  "첫 문단에는 `bd-desk-2lj.1.1`~`.1.4`와 [third, second] 같은 글자가 있습니다.",
  "",
  "* 별표 목록",
  "    - 네 칸 들여 쓴 하위 목록",
  "",
  "| 위치 | 이름 |",
  "| --- | --- |",
  "| `a.ts` | `b` |",
  "",
  "참고: https://github.com/Milkdown/milkdown",
  "",
  "```ts",
  "const a = 1;",
  "```",
  "",
].join("\n");

// 편집기가 같은 내용을 자기 서식으로 다시 쓴 결과입니다.
const NORMALIZED = [
  "## 배경",
  "",
  "첫 문단에는 `bd-desk-2lj.1.1`\\~`.1.4`와 \\[third, second] 같은 글자가 있습니다.",
  "",
  "- 별표 목록",
  "  - 네 칸 들여 쓴 하위 목록",
  "",
  "| 위치 | 이름 |",
  "| - | - |",
  "| `a.ts` | `b` |",
  "",
  "참고: <https://github.com/Milkdown/milkdown>",
  "",
  "```ts",
  "const a = 1;",
  "```",
  "",
].join("\n");

test("내용이 같으면 편집기가 서식을 바꿔 써도 원문을 그대로 돌려준다", () => {
  expect(keepUnchangedBlocks(ORIGINAL, NORMALIZED)).toBe(ORIGINAL);
});

test("고친 블록만 편집기 출력으로 바꾸고 나머지 블록은 원문 글자를 그대로 둔다", () => {
  const edited = NORMALIZED.replace(
    "참고: <https://github.com/Milkdown/milkdown>",
    "고친 문단입니다.",
  );

  expect(keepUnchangedBlocks(ORIGINAL, edited)).toBe(
    ORIGINAL.replace("참고: https://github.com/Milkdown/milkdown", "고친 문단입니다."),
  );
});

test("새로 넣은 블록은 앞뒤 원문 블록 사이에 빈 줄 하나로 끼운다", () => {
  const edited = NORMALIZED.replace("## 배경\n\n", "## 배경\n\n새 문단\n\n");

  expect(keepUnchangedBlocks(ORIGINAL, edited)).toBe(
    ORIGINAL.replace("## 배경\n\n", "## 배경\n\n새 문단\n\n"),
  );
});

test("지운 블록은 빠지고 나머지 블록은 원문 글자를 그대로 둔다", () => {
  const edited = NORMALIZED.replace("참고: <https://github.com/Milkdown/milkdown>\n\n", "");

  expect(keepUnchangedBlocks(ORIGINAL, edited)).toBe(
    ORIGINAL.replace("참고: https://github.com/Milkdown/milkdown\n\n", ""),
  );
});

test("원문이 비어 있으면 편집기 출력을 그대로 쓴다", () => {
  expect(keepUnchangedBlocks("", "* 새 목록\n")).toBe("* 새 목록\n");
});

test("편집기 출력이 비어 있으면 빈 값을 돌려준다", () => {
  expect(keepUnchangedBlocks(ORIGINAL, "")).toBe("");
});

test("편집기가 지운 참조 링크 정의는 원래 자리에 남고, 참조를 인라인 링크로 바꾼 문단도 원문을 그대로 둔다", () => {
  const original = [
    "[문서][1]를 봅니다.",
    "",
    "[메모]: https://example.com/memo",
    "",
    "고칠 문단",
    "",
    "[1]: https://example.com/doc",
    "",
  ].join("\n");
  const edited = "[문서](https://example.com/doc)를 봅니다.\n\n고친 문단\n";

  expect(keepUnchangedBlocks(original, edited)).toBe(original.replace("고칠 문단", "고친 문단"));
});

test("<br>만 있는 줄은 편집기가 <br />로 바꿔 써도 원문을 그대로 둔다", () => {
  const original = "첫 문단\n\n<br>\n\n끝 문단\n";
  const edited = "첫 문단\n\n<br />\n\n끝 문단\n";

  expect(keepUnchangedBlocks(original, edited)).toBe(original);
});
