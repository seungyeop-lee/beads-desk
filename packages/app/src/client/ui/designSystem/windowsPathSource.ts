// CommonMark는 링크 주소에서 ASCII 문장부호 앞의 `\`를 escape로 읽어 지웁니다. 그래서 `C:\work\.beads\a.md`는
// `C:\work.beads\a.md`로 파싱됩니다. 역슬래시로 시작하는 드라이브 경로에서는 `\`가 구분자이므로, 파싱한 주소와 함께
// 원문 주소를 남겨 두었다가 링크와 그림을 그릴 때 원래 경로를 되살리고, markdown으로 저장할 때 원문 주소를 그대로 씁니다.
import { defaultHandlers, type Handle, type State } from "mdast-util-to-markdown";

const BACKSLASH_DRIVE_PATH = /^[a-z]:\\/i;
const ESCAPE = /\\([!-/:-@[-`{-~])/g;
const LITERAL = String.raw`(?:[^<>\n\\]|\\.)*`;
const RAW = String.raw`(?:[^\s()\\]|\\.|\((?:[^\s()\\]|\\.)*\))+`;
const BRACKETED_DESTINATION = new RegExp(String.raw`^[ \t]*\n?[ \t]*<(${LITERAL})>`);
const BARE_DESTINATION = new RegExp(String.raw`^[ \t]*\n?[ \t]*(${RAW})`);
/** mdast-util-to-markdown이 주소를 쓰는 형식별로, 원문 주소를 그 형식에 그대로 쓸 수 있는지 검사합니다. */
const DESTINATION_FORMS: Record<string, RegExp | undefined> = {
  destinationLiteral: new RegExp(`^${LITERAL}$`),
  destinationRaw: new RegExp(`^${RAW}$`),
};

type MarkdownNode = {
  type: string;
  url?: unknown;
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: object;
  children?: MarkdownNode[];
};

/**
 * 역슬래시로 시작하는 드라이브 경로를 가리키는 link와 image node의 `data.sourceUrl`에 원문 주소를 남기는 remark plugin입니다.
 * 원문 주소를 찾지 못하면 아무것도 남기지 않습니다.
 *
 * remark-inline-links 다음에 실행해야 합니다. 편집기(Milkdown)에서는 이 plugin보다 remark-inline-links가 먼저 실행되어,
 * 참조 링크와 참조 그림(`[a][ref]`, `![a][ref]`)이 원문 위치와 참조 이름이 없는 link·image node로 바뀌고 정의(`[ref]: …`)는
 * 지워집니다. 그래서 원문 위치가 없는 node는 문서 전체의 정의 원문에서 파싱하면 그 주소가 되는 원문 주소를 찾습니다.
 * 그런 정의가 여럿이면 문서에서 처음 나온 정의를 씁니다.
 */
export function remarkWindowsPathSource() {
  return (tree: MarkdownNode, file: { value: unknown }) => {
    const markdown = String(file.value);
    const visit = (node: MarkdownNode) => {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if ((node.type === "link" || node.type === "image") && typeof node.url === "string") {
        const source =
          start !== undefined && end !== undefined
            ? sourceUrlIn(markdown.slice(start, end), "](", node.url)
            : sourceUrlIn(markdown, "]:", node.url);
        if (source !== null) node.data = { ...node.data, sourceUrl: source };
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

/** remarkWindowsPathSource가 node에 남긴 원문 주소입니다. 없으면 null입니다. */
export function sourceUrlOf(node: { data?: unknown }): string | null {
  return (node.data as { sourceUrl?: string } | undefined)?.sourceUrl ?? null;
}

/**
 * 파싱한 주소 `url`을 원문 주소 `source`의 `\`를 살린 경로로 바꿉니다. `\\`는 `\` 하나로 읽습니다.
 * 편집기에서 주소를 고치면 `source`가 고치기 전 주소로 남으므로, `source`를 파싱한 결과가 `url`과 같을 때만 바꿉니다.
 */
export function windowsPath(url: string, source: string | null): string {
  if (!source || !parsesTo(source, url)) return url;
  return source.replace(ESCAPE, (escape, character: string) =>
    character === "\\" ? character : escape,
  );
}

/**
 * link와 image를 markdown으로 쓸 때, `data.sourceUrl`의 원문 주소가 지금 주소로 파싱되면 그 원문을 주소로 쓰는
 * remark-stringify handler입니다. 기본 handler는 파싱한 주소를 escape해서 쓰므로 `C:\work.beads`처럼 `\`가 지워진 주소를
 * 그대로 내보냅니다. 편집기에서 주소를 고쳤거나 원문을 기본 handler가 고른 형식(`<…>` 또는 괄호 없는 주소)에 쓸 수
 * 없으면 기본 handler대로 씁니다.
 */
export const windowsPathHandlers = {
  link: keepSourceUrl(defaultHandlers.link),
  image: keepSourceUrl(defaultHandlers.image),
};

function keepSourceUrl(handle: Handle & { peek?: Handle }): Handle {
  const keep: Handle & { peek?: Handle } = (
    node: { url: string; data?: unknown },
    parent,
    state,
    info,
  ) => {
    const source = sourceUrlOf(node);
    if (source === null || !parsesTo(source, node.url)) return handle(node, parent, state, info);
    // 기본 handler가 주소를 쓰는 state.safe 호출만 원문으로 바꾸고, label과 title은 기본 handler대로 escape합니다.
    const keepSource = Object.create(state, {
      safe: {
        value(this: State, value: string | null | undefined, config: Parameters<State["safe"]>[1]) {
          const form = DESTINATION_FORMS[this.stack.at(-1) ?? ""];
          return value === node.url && form?.test(source)
            ? source
            : state.safe.call(this, value, config);
        },
      },
    }) as State;
    return handle(node, parent, keepSource, info);
  };
  keep.peek = handle.peek;
  return keep;
}

/**
 * 원문 `text`에서 `opener` 바로 뒤에 오는 주소 가운데, 파싱하면 `url`이 되는 드라이브 경로 주소를 찾습니다.
 * `opener`는 인라인 링크(`[text](주소 "title")`, `![alt](주소)`)이면 `](`, 정의(`[ref]: 주소 "title"`)이면 `]:`입니다.
 */
function sourceUrlIn(text: string, opener: "](" | "]:", url: string): string | null {
  for (let at = text.indexOf(opener); at !== -1; at = text.indexOf(opener, at + 1)) {
    const rest = text.slice(at + opener.length);
    const source = (BRACKETED_DESTINATION.exec(rest) ?? BARE_DESTINATION.exec(rest))?.[1];
    if (source !== undefined && parsesTo(source, url)) return source;
  }
  return null;
}

function parsesTo(source: string, url: string): boolean {
  return BACKSLASH_DRIVE_PATH.test(source) && source.replace(ESCAPE, "$1") === url;
}
