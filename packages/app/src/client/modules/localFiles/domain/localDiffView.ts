/** diff 화면의 변경 파일 트리에 놓이는 폴더나 파일입니다. */
export type DiffTreeNode =
  | {
      kind: "folder";
      /** 하위 폴더 하나뿐인 폴더를 합친 이름(`src/checkout`)입니다. */
      name: string;
      /** diff 안에서 폴더를 가리키는 경로입니다. 접고 펼친 상태를 이 값으로 기억합니다. */
      path: string;
      children: DiffTreeNode[];
    }
  | {
      kind: "file";
      /** 경로가 없는 파일 diff(hunk만 있는 diff)는 undefined입니다. */
      name: string | undefined;
      /** diff에 나온 파일 순서입니다. 같은 경로가 두 번 나와도 파일마다 다릅니다. */
      file: number;
    };

const NAMES = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * diff의 파일 경로들을 GitHub Pull Request의 "Files changed" 트리처럼 묶습니다. paths는 diff에 나온 순서의 파일 경로입니다.
 * 하위 항목이 폴더 하나뿐인 폴더는 그 폴더와 한 줄로 합치고, 같은 폴더 안에서는 폴더를 먼저, 그다음 이름순으로 둡니다.
 */
export function diffFileTree(paths: readonly (string | undefined)[]): DiffTreeNode[] {
  type Folder = {
    folders: Map<string, Folder>;
    files: { name: string | undefined; file: number }[];
  };
  const root: Folder = { folders: new Map(), files: [] };
  for (const [file, path] of paths.entries()) {
    const parts = path?.split("/").filter((part) => part !== "") ?? [];
    let folder = root;
    for (const part of parts.slice(0, -1)) {
      let child = folder.folders.get(part);
      if (!child) {
        child = { folders: new Map(), files: [] };
        folder.folders.set(part, child);
      }
      folder = child;
    }
    folder.files.push({ name: parts.at(-1), file });
  }

  const nodes = (folder: Folder, parent: string): DiffTreeNode[] => [
    ...[...folder.folders]
      .sort(([a], [b]) => NAMES.compare(a, b))
      .map(([name, child]): DiffTreeNode => {
        let merged = { name, path: `${parent}${name}`, folder: child };
        while (merged.folder.files.length === 0 && merged.folder.folders.size === 1) {
          const [[nextName, next]] = merged.folder.folders;
          merged = {
            name: `${merged.name}/${nextName}`,
            path: `${merged.path}/${nextName}`,
            folder: next,
          };
        }
        return {
          kind: "folder",
          name: merged.name,
          path: merged.path,
          children: nodes(merged.folder, `${merged.path}/`),
        };
      }),
    ...folder.files
      .toSorted((a, b) => NAMES.compare(a.name ?? "", b.name ?? ""))
      .map((file): DiffTreeNode => ({ kind: "file", ...file })),
  ];
  return nodes(root, "");
}

/** diff 화면의 트리 위에 보이는 커밋 메시지입니다. title은 처음부터 보이고, body는 눌러서 펼칩니다. */
export type DiffCommitMessage = { title: string; body: string };

/**
 * 첫 파일 diff 앞의 글(before)과 마지막 hunk 뒤의 글(after)에서 커밋 메시지의 제목과 나머지 글을 나눕니다. 둘 다 없으면 null입니다.
 * git format-patch 파일은 메일 머리의 `Subject:` 줄이 커밋 제목이므로, 그 줄에서 `[PATCH]` 같은 접두사를 뗀 글을 제목으로 씁니다.
 * `Subject:` 줄이 없으면 첫 글줄을 제목으로 씁니다. 나머지 글은 제목을 뺀 before 뒤에 after(서명 등)를 잇습니다.
 */
export function diffCommitMessage(before: string, after: string): DiffCommitMessage | null {
  const lines = (before || after).split("\n");
  const subject = subjectLines(lines);
  const titleLines = subject ?? { start: 0, end: 1, text: lines[0]! };
  const rest = [...lines.slice(0, titleLines.start), ...lines.slice(titleLines.end)]
    .join("\n")
    .trim();
  const title = titleLines.text.trim();
  if (!title) return null;
  return { title, body: [rest, before ? after : ""].filter(Boolean).join("\n\n") };
}

/**
 * 메일 머리(첫 빈 줄 앞)에서 `Subject:` 줄과, 공백으로 시작해 그 줄을 잇는 줄을 찾습니다.
 * git format-patch는 긴 제목을 여러 줄로 접어 쓰므로 이은 줄을 공백 하나로 붙입니다.
 */
function subjectLines(lines: string[]) {
  const headerEnd = lines.indexOf("");
  const header = headerEnd < 0 ? lines : lines.slice(0, headerEnd);
  const start = header.findIndex((line) => /^Subject:\s/i.test(line));
  if (start < 0) return null;
  let end = start + 1;
  while (end < header.length && /^\s/.test(header[end]!)) end += 1;
  const text = lines
    .slice(start, end)
    .map((line) => line.trim())
    .join(" ")
    .replace(/^Subject:\s*/i, "")
    .replace(/^\[[^\]]*PATCH[^\]]*\]\s*/i, "");
  return { start, end, text };
}
