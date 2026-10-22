import { expect, test } from "vitest";
import { type DiffLine, diffPreview } from "./diffPreview";

const GIT_DIFF = [
  "diff --git a/src/new.ts b/src/new.ts",
  "new file mode 100644",
  "index 0000000..7f21bdc",
  "--- /dev/null",
  "+++ b/src/new.ts",
  "@@ -0,0 +1,2 @@",
  "+export const a = 1;",
  "+export const b = 2;",
  "diff --git a/src/old.css b/src/renamed.css",
  "similarity index 79%",
  "rename from src/old.css",
  "rename to src/renamed.css",
  "--- a/src/old.css",
  "+++ b/src/renamed.css",
  "@@ -8,3 +8,3 @@ .file-preview pre {",
  " overflow: auto;",
  "-  max-height: 20rem;",
  "+  max-height: 24rem;",
  " padding: 8px;",
  "diff --git a/img.png b/img.png",
  "deleted file mode 100644",
  "Binary files a/img.png and /dev/null differ",
  "",
].join("\n");

/** 줄을 `부호 옛 번호 새 번호 내용`으로 적고, 강조한 단어는 [ ]로 감쌉니다. */
function describe(line: DiffLine) {
  const sign = { context: " ", added: "+", deleted: "-", note: "\\" }[line.kind];
  const text = line.words
    ? line.words.map((word) => (word.changed ? `[${word.text}]` : word.text)).join("")
    : line.text;
  return `${sign} ${line.oldNumber ?? "_"} ${line.newNumber ?? "_"} ${text}`;
}

function hunkLines(text: string) {
  return diffPreview(text)!.files[0]!.hunks[0]!.lines.map(describe);
}

test("git diff를 파일마다 경로, 배지, 추가·삭제 수로 나누고, hunk 머리 줄을 파일에 적힌 그대로 남긴다", () => {
  const preview = diffPreview(GIT_DIFF)!;

  expect(preview.files).toMatchObject([
    {
      path: "src/new.ts",
      renamedFrom: undefined,
      badges: ["new"],
      additions: 2,
      deletions: 0,
    },
    {
      path: "src/renamed.css",
      renamedFrom: "src/old.css",
      badges: ["renamed"],
      additions: 1,
      deletions: 1,
    },
    {
      path: "img.png",
      renamedFrom: undefined,
      badges: ["deleted", "binary"],
      additions: 0,
      deletions: 0,
    },
  ]);
  expect(preview.files.flatMap((file) => file.hunks.map((hunk) => hunk.header))).toEqual([
    "@@ -0,0 +1,2 @@",
    "@@ -8,3 +8,3 @@ .file-preview pre {",
  ]);
  expect(preview.before).toBe("");
  expect(preview.after).toBe("");
});

test("줄 번호는 hunk 시작 번호부터 문맥 줄은 양쪽, 삭제 줄은 옛 번호, 추가 줄은 새 번호만 센다", () => {
  expect(
    hunkLines(
      ["@@ -10,4 +20,5 @@", " a", "-b", "+c", "+d", "", " e", "\\ No newline at end of file"].join(
        "\n",
      ),
    ),
  ).toEqual([
    "  10 20 a",
    "- 11 _ b",
    "+ _ 21 c",
    "+ _ 22 d",
    "  12 23 ",
    "  13 24 e",
    "\\ _ _ \\ No newline at end of file",
  ]);
});

test("비슷한 삭제·추가 줄은 바뀐 단어만 강조하고, 관계없는 줄은 건너뛰어 그다음 비슷한 줄과 짝짓는다", () => {
  expect(
    hunkLines(
      [
        "@@ -1,2 +1,3 @@",
        "-  max-height: 20rem;",
        "-  return extension ? (FORMATS.get(extension) ?? null) : null;",
        "+  max-height: 24rem;",
        "+  if (!extension) return null;",
        "+  return FORMATS.get(extension) ?? null;",
      ].join("\n"),
    ),
  ).toEqual([
    "- 1 _   max-height: [20rem];",
    "- 2 _   return [extension ? (]FORMATS.get(extension) ?? null[) : null];",
    "+ _ 1   max-height: [24rem];",
    "+ _ 2   if (!extension) return null;",
    "+ _ 3   return FORMATS.get(extension) ?? null;",
  ]);
});

test("관계없는 줄만 있는 삭제·추가 묶음에는 단어 강조가 없다", () => {
  expect(hunkLines(["@@ -1 +1 @@", "-import a from 'x';", "+}"].join("\n"))).toEqual([
    "- 1 _ import a from 'x';",
    "+ _ 1 }",
  ]);
});

test("git format-patch의 메일 머리와 커밋 메시지, 끝의 서명을 버리지 않고 diff 앞뒤의 글로 남긴다", () => {
  const before = [
    "From 1234 Mon Sep 17 00:00:00 2001",
    "Subject: [PATCH] 값을 고친다",
    "",
    "---",
    " a.txt | 2 +-",
  ].join("\n");
  const patch = [
    before,
    "",
    "diff --git a/a.txt b/a.txt",
    "--- a/a.txt",
    "+++ b/a.txt",
    "@@ -1 +1 @@",
    "-x",
    "+y",
    "-- ",
    "2.39.0",
    "",
  ].join("\n");

  const preview = diffPreview(patch)!;

  expect(preview.before).toBe(before);
  expect(preview.files.map((file) => file.path)).toEqual(["a.txt"]);
  expect(preview.after).toBe("-- \n2.39.0");
});

test("마지막 hunk 뒤에 붙은 글도 diff 뒤의 글로 남긴다", () => {
  expect(diffPreview("@@ -1 +1 @@\n-x\n+y\n\n검토 메모: 확인 필요\n")!.after).toBe(
    "검토 메모: 확인 필요",
  );
});

test.each([
  ["파일 diff가 없는 글", "+ 이 줄은 로그입니다\n두 번째 줄"],
  ["줄 수가 hunk 머리와 맞지 않는 diff", "@@ -1,3 +1,3 @@\n-a\n+b\n"],
])("%s는 null이다", (_name, text) => {
  expect(diffPreview(text)).toBeNull();
});
