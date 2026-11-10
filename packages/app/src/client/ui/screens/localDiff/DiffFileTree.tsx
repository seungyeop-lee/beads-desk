import { type CSSProperties, useId, useState } from "react";
import type { DiffTreeNode } from "@/client/modules/localFiles/domain/localDiffView";
import type { DiffFile } from "@/client/modules/markdown/domain/diffPreview";
import {
  ChevronRightIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

// 깊이(--tree-depth)마다 들여 써서 어느 폴더 아래의 항목인지 보이게 합니다. 파일 줄은 폴더 줄의 chevron 폭만큼 더 들여 써,
// 폴더 아이콘과 파일 아이콘이 같은 자리에서 시작합니다.
const ROW =
  "flex w-full min-w-0 items-start gap-1.5 rounded-field py-1 pr-2 text-left text-sm hover:bg-base-200";
const FOLDER_INDENT = "pl-[calc(var(--tree-depth)*0.75rem+0.5rem)]";
const FILE_INDENT = "pl-[calc(var(--tree-depth)*0.75rem+1.875rem)]";

/** 변경 파일 트리입니다. 폴더는 눌러서 접고 펼치고, 파일을 누르면 onOpen에 그 파일의 diff 순서를 넘깁니다. */
export function DiffFileTree({
  nodes,
  files,
  onOpen,
}: {
  nodes: DiffTreeNode[];
  files: DiffFile[];
  onOpen: (file: number) => void;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const toggle = (path: string) =>
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  return (
    <TreeLevel
      nodes={nodes}
      files={files}
      depth={0}
      collapsed={collapsed}
      toggle={toggle}
      onOpen={onOpen}
    />
  );
}

function TreeLevel({
  nodes,
  files,
  depth,
  collapsed,
  toggle,
  onOpen,
}: {
  nodes: DiffTreeNode[];
  files: DiffFile[];
  depth: number;
  collapsed: ReadonlySet<string>;
  toggle: (path: string) => void;
  onOpen: (file: number) => void;
}) {
  return (
    <ul className="flex flex-col" style={{ "--tree-depth": depth } as CSSProperties}>
      {nodes.map((node) =>
        node.kind === "folder" ? (
          <li key={`folder:${node.path}`}>
            <button
              type="button"
              className={`${ROW} ${FOLDER_INDENT}`}
              aria-expanded={!collapsed.has(node.path)}
              onClick={() => toggle(node.path)}
            >
              <ChevronRightIcon
                className={`mt-0.5 shrink-0 text-emphasis-50 transition-transform ${collapsed.has(node.path) ? "" : "rotate-90"}`}
              />
              <FolderIcon className="mt-0.5 shrink-0 fill-primary/10 text-primary/70" />
              <span className="font-medium wrap-anywhere">{node.name}</span>
            </button>
            {!collapsed.has(node.path) && (
              <TreeLevel
                nodes={node.children}
                files={files}
                depth={depth + 1}
                collapsed={collapsed}
                toggle={toggle}
                onOpen={onOpen}
              />
            )}
          </li>
        ) : (
          <li key={`file:${node.file}`}>
            <FileRow file={files[node.file]!} name={node.name} onOpen={() => onOpen(node.file)} />
          </li>
        ),
      )}
    </ul>
  );
}

function FileRow({
  file,
  name,
  onOpen,
}: {
  file: DiffFile;
  name: string | undefined;
  onOpen: () => void;
}) {
  const messages = useMessages();
  const descriptionId = useId();
  const status = file.badges.includes("new")
    ? "new"
    : file.badges.includes("deleted")
      ? "deleted"
      : "modified";
  const StatusIcon = status === "new" ? PlusIcon : status === "deleted" ? TrashIcon : PencilIcon;
  const color =
    status === "new"
      ? "text-(--code-literal)"
      : status === "deleted"
        ? "text-error"
        : "text-(--code-class)";
  const description = [
    status === "modified"
      ? messages.localDiff.modified
      : messages.markdownEditor.diffBadges[status],
    ...file.badges
      .filter((badge) => badge === "renamed" || badge === "binary")
      .map((badge) => messages.markdownEditor.diffBadges[badge]),
  ].join(", ");
  return (
    <>
      <button
        type="button"
        className={`${ROW} ${FILE_INDENT}`}
        aria-describedby={descriptionId}
        data-tooltip={description}
        onClick={onOpen}
      >
        <StatusIcon className={`mt-0.5 shrink-0 ${color}`} />
        <span className="min-w-0 wrap-anywhere">{name ?? messages.localDiff.unnamedFile}</span>
      </button>
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
    </>
  );
}
