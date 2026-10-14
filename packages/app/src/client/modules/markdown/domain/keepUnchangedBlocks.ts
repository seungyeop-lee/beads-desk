import remarkGfm from "remark-gfm";
import remarkInlineLinks from "remark-inline-links";
import remarkParse from "remark-parse";
import { unified } from "unified";

const parser = unified().use(remarkParse).use(remarkGfm);
const inlineLinks = remarkInlineLinks();
const BR_HTML = /^<br\s*\/?\s*>$/i;

type Block = {
  start: number;
  end: number;
  /**
   * 위치 정보를 뺀 구문 트리입니다. 서식만 다르고 내용이 같은 두 블록은 같은 값이 됩니다.
   * 참조 링크 정의는 편집기 출력에 나오지 않으므로 null이고, 어느 블록과도 짝짓지 않습니다.
   */
  shape: string | null;
};

/**
 * 편집기가 markdown 전체를 다시 쓴 결과에서, 내용이 바뀌지 않은 최상위 블록을 원문 글자로 되돌립니다.
 * 편집기는 목록 기호, escape, 들여쓰기 같은 서식을 자기 방식으로 바꿔 쓰므로, 고치지 않은 부분까지
 * bd에 바뀐 서식으로 저장되는 것을 막습니다. 고친 블록과 새 블록만 편집기 출력을 씁니다.
 */
export function keepUnchangedBlocks(original: string, edited: string): string {
  const before = blocksOf(original);
  const after = blocksOf(edited);
  if (before.length === 0 || after.length === 0) return edited;

  const sources = matchBlocks(before, after);
  // 원문 블록은 번호로, 편집기가 새로 쓴 블록은 Block으로 담습니다.
  const pieces: (number | Block)[] = [];
  // 편집기 출력에 없는 참조 링크 정의는 원문에서 놓였던 순서대로 끼워 넣습니다.
  const definitions = before.flatMap((block, index) => (block.shape === null ? [index] : []));
  after.forEach((block, index) => {
    const source = sources[index]!;
    if (source !== -1) {
      while ((definitions[0] ?? Infinity) < source) pieces.push(definitions.shift()!);
      pieces.push(source);
      return;
    }
    // 바로 앞 원문 블록 뒤에 붙어 있던 정의는 새로 쓴 블록보다 앞에 둡니다.
    const last = pieces.length === 0 ? -1 : pieces.at(-1);
    if (typeof last === "number") {
      for (let next = last + 1; definitions[0] === next; next++) pieces.push(definitions.shift()!);
    }
    pieces.push(block);
  });
  pieces.push(...definitions);

  let result = "";
  pieces.forEach((piece, index) => {
    const previous = pieces[index - 1];
    if (typeof piece !== "number") {
      result += (index === 0 ? "" : "\n\n") + edited.slice(piece.start, piece.end);
      return;
    }
    if (index === 0) result += piece === 0 ? original.slice(0, before[0]!.start) : "";
    else if (previous === piece - 1)
      result += original.slice(before[piece - 1]!.end, before[piece]!.start);
    else result += "\n\n";
    result += original.slice(before[piece]!.start, before[piece]!.end);
  });
  return result + original.slice(before.at(-1)!.end);
}

/** 편집기(Milkdown)가 문서를 읽을 때 하는 변환을 원문에도 적용해 모양을 구합니다. */
function blocksOf(markdown: string): Block[] {
  const tree = parser.parse(markdown);
  const nodes = [...tree.children];
  // inlineLinks는 tree에서 정의를 지우므로, 정의 블록은 먼저 복사해 둔 nodes에서 찾습니다.
  inlineLinks(tree);
  return nodes.map((node) => ({
    start: node.position!.start.offset!,
    end: node.position!.end.offset!,
    shape: node.type === "definition" ? null : JSON.stringify(node, shapeValue),
  }));
}

function shapeValue(key: string, value: unknown): unknown {
  if (key === "position") return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  // remark-inline-links가 만든 link node는 parser가 만든 것과 속성 순서가 다릅니다.
  const node = Object.fromEntries(Object.entries(value).toSorted(([a], [b]) => a.localeCompare(b)));
  // 편집기는 <br>만 있는 줄을 <br />로 씁니다.
  if (node.type === "html" && BR_HTML.test(String(node.value).trim())) node.value = "<br>";
  return node;
}

/** after의 각 블록과 내용이 같은 before 블록의 위치를 순서를 지키며 최대한 많이 짝짓습니다. 짝이 없으면 -1입니다. */
function matchBlocks(before: Block[], after: Block[]): number[] {
  // lengths[i][j]: before[i..]와 after[j..]에서 짝지을 수 있는 블록 수(최장 공통 부분열)
  const lengths = Array.from({ length: before.length + 1 }, () =>
    Array.from({ length: after.length + 1 }, () => 0),
  );
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lengths[i]![j] =
        before[i]!.shape === after[j]!.shape
          ? lengths[i + 1]![j + 1]! + 1
          : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
    }
  }

  const sources = Array.from({ length: after.length }, () => -1);
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i]!.shape === after[j]!.shape) {
      sources[j] = i;
      i++;
      j++;
    } else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }
  return sources;
}
