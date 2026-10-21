// CommonMark는 링크 주소에서 ASCII 문장부호 앞의 `\`를 escape로 읽어 지웁니다. 그래서 `C:\work\.beads\a.md`는
// `C:\work.beads\a.md`로 파싱됩니다. 역슬래시로 시작하는 드라이브 경로에서는 `\`가 구분자이므로, 파싱한 주소와 함께
// 원문 주소를 남겨 두었다가 링크와 그림을 그릴 때 원래 경로를 되살립니다. 파싱한 주소는 그대로 두므로 저장하는
// markdown은 바뀌지 않습니다.
const BACKSLASH_DRIVE_PATH = /^[a-z]:\\/i;
const ESCAPE = /\\([!-/:-@[-`{-~])/g;
const BRACKETED_DESTINATION = /^[ \t]*\n?[ \t]*<((?:[^<>\n\\]|\\.)*)>/;
const BARE_DESTINATION = /^[ \t]*\n?[ \t]*((?:[^\s()\\]|\\.|\((?:[^\s()\\]|\\.)*\))+)/;

type MarkdownNode = {
  type: string;
  url?: unknown;
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: object;
  children?: MarkdownNode[];
};

/**
 * 역슬래시로 시작하는 드라이브 경로를 가리키는 link와 image node의 `data.sourceUrl`에 원문 주소를 남기는 remark plugin입니다.
 * 원문 주소를 찾지 못하면 아무것도 남기지 않습니다. 참조 링크(`[a][ref]`)는 원문에 주소가 없어 남기지 않습니다.
 */
export function remarkWindowsPathSource() {
  return (tree: MarkdownNode, file: { value: unknown }) => {
    const markdown = String(file.value);
    const visit = (node: MarkdownNode) => {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (
        (node.type === "link" || node.type === "image") &&
        typeof node.url === "string" &&
        start !== undefined &&
        end !== undefined
      ) {
        const source = sourceUrlIn(markdown.slice(start, end), node.url);
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

/** `[text](주소 "title")`이나 `![alt](주소)` 원문에서 파싱하면 `url`이 되는 드라이브 경로 주소를 찾습니다. */
function sourceUrlIn(text: string, url: string): string | null {
  for (let at = text.indexOf("]("); at !== -1; at = text.indexOf("](", at + 1)) {
    const rest = text.slice(at + 2);
    const source = (BRACKETED_DESTINATION.exec(rest) ?? BARE_DESTINATION.exec(rest))?.[1];
    if (source !== undefined && parsesTo(source, url)) return source;
  }
  return null;
}

function parsesTo(source: string, url: string): boolean {
  return BACKSLASH_DRIVE_PATH.test(source) && source.replace(ESCAPE, "$1") === url;
}
