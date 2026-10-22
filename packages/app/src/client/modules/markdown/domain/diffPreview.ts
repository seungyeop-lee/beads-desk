import { type ChangeObject, diffWordsWithSpace, parsePatch, type StructuredPatch } from "diff";

/** 펼친 .diff·.patch 파일을 파일별 diff 보기로 그릴 내용입니다. */
export type DiffPreview = {
  /** 첫 파일 diff 앞의 글(git format-patch의 메일 머리와 커밋 메시지 등)입니다. 없으면 빈 문자열입니다. */
  before: string;
  files: DiffFile[];
  /** 마지막 hunk 뒤의 글(git format-patch의 서명 등)입니다. 없으면 빈 문자열입니다. */
  after: string;
};

export type DiffFileBadge = "new" | "deleted" | "renamed" | "binary";

export type DiffFile = {
  /** a/·b/ 접두사를 뗀 경로입니다. 삭제한 파일은 옛 경로입니다. hunk만 있는 diff처럼 경로가 없으면 undefined입니다. */
  path: string | undefined;
  /** 이름을 바꾼 파일의 옛 경로입니다. */
  renamedFrom: string | undefined;
  badges: DiffFileBadge[];
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
};

export type DiffHunk = {
  /** 파일에 적힌 hunk 머리 줄(`@@ -8,13 +8,15 @@ 함수 이름`) 그대로입니다. */
  header: string;
  lines: DiffLine[];
};

export type DiffLine = {
  /** note는 `\ No newline at end of file` 줄입니다. */
  kind: "context" | "added" | "deleted" | "note";
  oldNumber?: number;
  newNumber?: number;
  /** 부호를 뗀 줄 내용입니다. note는 줄 전체입니다. */
  text: string;
  /** 짝이 되는 삭제·추가 줄과 단어 단위로 비교해 나눈 조각입니다. 단어 강조를 하지 않는 줄은 undefined입니다. */
  words?: { text: string; changed: boolean }[];
};

/**
 * 삭제 줄과 추가 줄이 공유하는 글자(공백 제외)가 두 줄 글자 수의 이 비율보다 적으면 서로 관계없는 줄로 보고 단어 강조를 하지 않습니다.
 * 모든 단어가 바뀐 줄 쌍에 강조를 입히면 줄 전체가 진하게 칠해져 오히려 바뀐 곳을 찾기 어렵습니다.
 */
const SIMILAR_RATIO = 0.5;
/** 삭제 줄마다 짝을 찾아 비교해 보는 추가 줄 수입니다. 비교 횟수가 삭제 줄 수에 비례하게 묶어, 큰 변경 묶음에서도 멈추지 않게 합니다. */
const PAIR_SEARCH_LINES = 4;
/** 줄 쌍의 단어 비교를 포기하는 편집 수(토큰)입니다. 이 한도를 넘는 줄은 단어 강조 없이 그립니다. */
const MAX_WORD_EDITS = 100;

/**
 * diff 원문을 파일과 hunk와 줄로 나눕니다. 파일 diff를 하나도 찾지 못하거나 jsdiff가 원문을 읽지 못하면 null을 돌려줍니다.
 * jsdiff의 parsePatch는 첫 diff 앞의 글과 hunk 뒤의 글을 버리고 hunk 머리 줄의 뒷부분도 남기지 않으므로, 이 셋은 원문에서 직접 찾습니다.
 */
export function diffPreview(text: string): DiffPreview | null {
  const lines = text.split("\n");
  const start = lines.findIndex((line, index) => isDiffStart(line, lines[index + 1]));
  if (start < 0) return null;
  const end = signatureStart(lines, start) ?? lines.length;
  const body = lines.slice(start, end);
  let patches: StructuredPatch[];
  try {
    patches = parsePatch(body.join("\n")).filter((patch) => patch.hunks.length > 0 || patch.isGit);
  } catch {
    return null;
  }
  if (patches.length === 0) return null;

  // parsePatch는 `@@`로 시작하는 줄마다 hunk 하나를 만들므로, 그 줄들은 hunk와 같은 순서입니다.
  const hunkRows = body.flatMap((line, row) => (/^@@\s/.test(line) ? [row] : []));
  const lastHunk = patches.at(-1)!.hunks.at(-1);
  const bodyEnd = lastHunk ? hunkRows.at(-1)! + 1 + lastHunk.lines.length : body.length;
  let hunkOrder = 0;
  return {
    before: textBlock(lines.slice(0, start)),
    files: patches.map((patch) => diffFile(patch, () => body[hunkRows[hunkOrder++]!]!)),
    after: textBlock([...body.slice(bodyEnd), ...lines.slice(end)]),
  };
}

/** 줄들을 앞뒤 빈 줄 없이 이은 글입니다. */
function textBlock(lines: string[]) {
  return lines
    .join("\n")
    .replace(/^\s*\n/, "")
    .trimEnd();
}

/** 파일 diff가 시작하는 줄인지 봅니다. `--- ` 줄은 커밋 메시지에도 나올 수 있어 바로 다음 줄이 `+++ `일 때만 시작으로 봅니다. */
function isDiffStart(line: string, next: string | undefined) {
  return (
    /^(?:diff --git |Index:\s|diff(?: -r \w+)+\s|@@ -\d)/.test(line) ||
    (line.startsWith("--- ") && next?.startsWith("+++ ") === true)
  );
}

/**
 * git format-patch가 끝에 붙이는 서명(`-- ` 줄과 git 버전)이 시작하는 줄을 돌려줍니다.
 * 서명은 마지막 hunk 바로 뒤에 붙어 있어, 떼지 않으면 parsePatch가 `-- ` 줄을 hunk의 삭제 줄로 읽다가 예외를 던집니다.
 * 그 뒤에 diff 줄처럼 보이는 줄이 있으면 서명이 아니라 `- `를 지운 삭제 줄로 봅니다.
 */
function signatureStart(lines: string[], start: number) {
  const index = lines.lastIndexOf("-- ");
  if (index <= start) return undefined;
  const rest = lines.slice(index + 1);
  const signature =
    rest.some((line) => line.trim() !== "") &&
    !rest.some((line) => /^(?:[-+ \\@]|diff |Index:)/.test(line));
  return signature ? index : undefined;
}

function diffFile(patch: StructuredPatch, nextHunkHeader: () => string): DiffFile {
  const oldPath = withoutPrefix(patch.oldFileName, "a/");
  const newPath = withoutPrefix(patch.newFileName, "b/");
  const created = patch.isCreate === true || oldPath === "/dev/null";
  const deleted = patch.isDelete === true || newPath === "/dev/null";
  const flags: [DiffFileBadge, boolean][] = [
    ["new", created],
    ["deleted", deleted],
    ["renamed", patch.isRename === true],
    ["binary", patch.isBinary === true],
  ];
  const hunks = patch.hunks.map((hunk) => diffHunk(hunk, nextHunkHeader()));
  const count = (kind: DiffLine["kind"]) =>
    hunks.reduce((sum, hunk) => sum + hunk.lines.filter((line) => line.kind === kind).length, 0);
  return {
    path: deleted ? oldPath : newPath,
    renamedFrom: patch.isRename ? oldPath : undefined,
    badges: flags.filter(([, on]) => on).map(([badge]) => badge),
    additions: count("added"),
    deletions: count("deleted"),
    hunks,
  };
}

function withoutPrefix(path: string | undefined, prefix: string) {
  return path?.startsWith(prefix) ? path.slice(prefix.length) : path;
}

function diffHunk(hunk: StructuredPatch["hunks"][number], header: string): DiffHunk {
  let oldNumber = hunk.oldStart;
  let newNumber = hunk.newStart;
  const lines = hunk.lines.map((line): DiffLine => {
    const text = line.slice(1);
    switch (line[0]) {
      case "+":
        return { kind: "added", newNumber: newNumber++, text };
      case "-":
        return { kind: "deleted", oldNumber: oldNumber++, text };
      case "\\":
        return { kind: "note", text: line };
      default:
        // parsePatch는 hunk 안의 빈 줄을 공백이 지워진 문맥 줄로 읽습니다.
        return { kind: "context", oldNumber: oldNumber++, newNumber: newNumber++, text };
    }
  });
  for (const block of changeBlocks(lines)) {
    markChangedWords(
      block.filter((line) => line.kind === "deleted"),
      block.filter((line) => line.kind === "added"),
    );
  }
  return { header, lines };
}

/** 문맥 줄 사이에 이어진 삭제·추가 줄 묶음입니다. */
function changeBlocks(lines: DiffLine[]) {
  const blocks: DiffLine[][] = [];
  let block: DiffLine[] = [];
  for (const line of [...lines, undefined]) {
    if (line && line.kind !== "context") {
      block.push(line);
    } else if (block.length > 0) {
      blocks.push(block);
      block = [];
    }
  }
  return blocks;
}

/**
 * 삭제 줄마다 아직 짝이 없는 추가 줄을 앞에서부터 비교해, 처음 만난 비슷한 줄과 짝을 짓고 두 줄의 바뀐 단어를 표시합니다.
 * 순서를 지켜 짝을 지으므로, 한 줄을 고치면서 그 앞에 새 줄을 넣은 변경도 고친 줄끼리 비교합니다.
 */
function markChangedWords(deleted: DiffLine[], added: DiffLine[]) {
  let next = 0;
  for (const removed of deleted) {
    const candidates = added.slice(next, next + PAIR_SEARCH_LINES);
    for (const [offset, inserted] of candidates.entries()) {
      const parts = similarWords(removed.text, inserted.text);
      if (!parts) continue;
      removed.words = parts
        .filter((part) => !part.added)
        .map((part) => ({ text: part.value, changed: part.removed }));
      inserted.words = parts
        .filter((part) => !part.removed)
        .map((part) => ({ text: part.value, changed: part.added }));
      next += offset + 1;
      break;
    }
  }
}

/** 두 줄을 단어 단위로 비교한 결과입니다. 두 줄이 관계없거나 비교 한도를 넘으면 undefined입니다. */
function similarWords(before: string, after: string): ChangeObject<string>[] | undefined {
  const parts = diffWordsWithSpace(before, after, { maxEditLength: MAX_WORD_EDITS });
  if (!parts) return undefined;
  const visible = (text: string) => text.replace(/\s/g, "").length;
  const total = visible(before) + visible(after);
  const common = parts
    .filter((part) => !part.added && !part.removed)
    .reduce((sum, part) => sum + visible(part.value), 0);
  return total > 0 && (2 * common) / total >= SIMILAR_RATIO ? parts : undefined;
}
