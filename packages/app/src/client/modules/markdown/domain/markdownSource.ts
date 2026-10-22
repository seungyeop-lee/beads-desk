import remarkGfm from "remark-gfm";
import remarkInlineLinks from "remark-inline-links";
import remarkParse from "remark-parse";
import { unified } from "unified";

/**
 * 편집기(Milkdown)가 markdown 문서를 읽는 변환을 원문에 똑같이 적용하는 구성입니다.
 *
 * 편집기는 remarkParse와 remarkGfm으로 문서를 파싱한 뒤 remark-inline-links로 참조 링크와 참조 그림을
 * 인라인 링크·그림으로 바꿉니다. 이때 참조가 원문에서 차지하던 위치와 참조 이름이 사라지고 정의(`[ref]: …`)는
 * tree에서 지워집니다. keepUnchangedBlocks와 windowsPathSource가 이 변환을 각자 흉내 내면 편집기의 parser
 * 구성이 바뀔 때 한쪽만 어긋나므로, parser 구성과 참조 정의 찾기를 이 파일 한 곳에 둡니다.
 */

/** 이 module이 읽는 구문 트리 node의 모양입니다. */
export type MarkdownNode = {
  type: string;
  url?: unknown;
  identifier?: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: object;
  children?: MarkdownNode[];
};

/** 파싱만 한 구문 트리의 최상위 node입니다. children은 반드시 있습니다. */
export type MarkdownRoot = MarkdownNode & { children: MarkdownNode[] };

/** remark-inline-links가 참조 node를 바꿔 만드는 node의 종류입니다. */
const INLINED_TYPES: Record<string, string | undefined> = {
  linkReference: "link",
  imageReference: "image",
};

const parser = unified().use(remarkParse).use(remarkGfm);
const inlineLinks = remarkInlineLinks() as unknown as (tree: MarkdownRoot) => void;

/** 원문을 편집기와 같은 구성으로 파싱합니다. 변환을 실행하지 않으므로 참조와 정의가 남습니다. */
export function parseMarkdown(markdown: string): MarkdownRoot {
  return parser.parse(markdown) as unknown as MarkdownRoot;
}

/** tree에서 참조 링크와 참조 그림을 인라인 링크·그림으로 바꾸고 정의를 지웁니다. tree를 고쳐 씁니다. */
export function applyInlineLinks(tree: MarkdownRoot): void {
  inlineLinks(tree);
}

/** tree의 node를 문서 순서(전위 순회)로 늘어놓습니다. remark-inline-links가 참조를 바꾸는 순서와 같습니다. */
export function nodesIn(tree: MarkdownNode): MarkdownNode[] {
  return [tree, ...(tree.children ?? []).flatMap(nodesIn)];
}

/**
 * 참조 링크와 참조 그림마다 그 참조가 이름으로 가리키는 정의를 문서 순서대로 구합니다. 같은 이름의 정의가 여럿이면
 * CommonMark처럼 처음 나온 정의를 쓰고, 정의가 없는 참조는 remark-inline-links도 바꾸지 않으므로 뺍니다.
 */
export function referencedDefinitions(
  tree: MarkdownNode,
): { type: string; definition: MarkdownNode }[] {
  const nodes = nodesIn(tree);
  const definitions = new Map<string, MarkdownNode>();
  for (const node of nodes) {
    const name = node.identifier?.toUpperCase();
    if (node.type === "definition" && name !== undefined && !definitions.has(name)) {
      definitions.set(name, node);
    }
  }
  return nodes.flatMap((node) => {
    const type = INLINED_TYPES[node.type];
    const definition = definitions.get(node.identifier?.toUpperCase() ?? "");
    return type && definition ? [{ type, definition }] : [];
  });
}
