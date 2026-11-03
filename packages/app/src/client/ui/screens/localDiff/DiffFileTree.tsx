import { type CSSProperties, useState } from "react";
import type { DiffTreeNode } from "@/client/modules/localFiles/domain/localDiffView";
import { ChevronRightIcon, FileIcon, FolderIcon } from "@/client/ui/designSystem/icons";
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
  onOpen,
}: {
  nodes: DiffTreeNode[];
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
    <TreeLevel nodes={nodes} depth={0} collapsed={collapsed} toggle={toggle} onOpen={onOpen} />
  );
}

function TreeLevel({
  nodes,
  depth,
  collapsed,
  toggle,
  onOpen,
}: {
  nodes: DiffTreeNode[];
  depth: number;
  collapsed: ReadonlySet<string>;
  toggle: (path: string) => void;
  onOpen: (file: number) => void;
}) {
  const messages = useMessages();
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
              <FolderIcon className="mt-0.5 shrink-0 text-emphasis-50" />
              <span className="font-medium wrap-anywhere">{node.name}</span>
            </button>
            {!collapsed.has(node.path) && (
              <TreeLevel
                nodes={node.children}
                depth={depth + 1}
                collapsed={collapsed}
                toggle={toggle}
                onOpen={onOpen}
              />
            )}
          </li>
        ) : (
          <li key={`file:${node.file}`}>
            <button
              type="button"
              className={`${ROW} ${FILE_INDENT}`}
              onClick={() => onOpen(node.file)}
            >
              <FileIcon className="mt-0.5 shrink-0 text-emphasis-50" />
              <span className="wrap-anywhere">{node.name ?? messages.localDiff.unnamedFile}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  );
}
