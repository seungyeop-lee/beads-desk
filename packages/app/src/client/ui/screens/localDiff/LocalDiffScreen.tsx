"use client";

import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  LOCAL_DIFF_MAX_BYTES,
  useDiffWrap,
  useLocalDiffFile,
} from "@/client/modules/localFiles/application/useLocalDiffFile";
import {
  type DiffCommitMessage,
  diffCommitMessage,
  diffFileTree,
} from "@/client/modules/localFiles/domain/localDiffView";
import { pathName } from "@/shared/domain/localFiles/localPaths";
import type { DiffPreview } from "@/client/modules/markdown/domain/diffPreview";
import { useWorkspaceSlug } from "@/client/ui/address/workspaceAddress";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import {
  ChevronRightIcon,
  DownloadIcon,
  PanelLeftIcon,
  WrapTextIcon,
} from "@/client/ui/designSystem/icons";
import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { DIFF_WRAP_CLASS, diffView } from "@/client/ui/markdown/diffPreviewView";
import { highlightedFileText } from "@/client/ui/markdown/highlightedFileText";
import { LOCAL_DIFF_QUERY, localFileUrl } from "@/shared/contract/localFiles";
import { DiffFileTree } from "./DiffFileTree";

const ICON_BUTTON = "btn btn-ghost btn-sm btn-square text-emphasis-70";
const PRESSED = "bg-base-300 text-base-content";
/** 이 너비(Tailwind md)보다 좁은 창에서는 변경 파일 트리를 처음에 숨겨, diff가 화면 폭을 모두 씁니다. */
const WIDE_SCREEN = "(min-width: 48rem)";

/**
 * 주소의 path가 가리키는 .diff·.patch 파일을 보여 줍니다. 왼쪽에는 커밋 메시지와 변경 파일 트리를, 오른쪽에는 diff 전체를 둡니다.
 * 파일은 파일 API로 한 번 읽고, 파일 시스템이 바뀌어도 다시 읽지 않습니다. 내려받기는 같은 파일 API 주소의 원문을 받습니다.
 * 주소를 useSearchParams로 읽으므로 Suspense 안에서 렌더링합니다.
 */
export function LocalDiffScreen() {
  const path = useSearchParams().get(LOCAL_DIFF_QUERY.path) ?? "";
  const url = localFileUrl(path, useWorkspaceSlug());
  const file = useLocalDiffFile(url);
  const [wrap, setWrap] = useDiffWrap();
  const wide = useSyncExternalStore(subscribeWideScreen, isWideScreen, () => false);
  const [treeChoice, setTreeChoice] = useState<boolean | null>(null);
  const treeShown = treeChoice ?? wide;
  const treeId = useId();
  const text = useMessages().localDiff;
  const name = pathName(path);

  return (
    <ScreenFrame variant="panes">
      <ScreenHeader title={name} loading={file.status === "loading"}>
        {file.status === "diff" && (
          <>
            <button
              type="button"
              className={`${ICON_BUTTON} ${treeShown ? PRESSED : ""}`}
              aria-label={text.fileTree}
              title={text.fileTree}
              aria-controls={treeId}
              aria-expanded={treeShown}
              onClick={() => setTreeChoice(!treeShown)}
            >
              <PanelLeftIcon />
            </button>
            <button
              type="button"
              className={`${ICON_BUTTON} ${wrap ? PRESSED : ""}`}
              aria-label={text.wrap}
              title={text.wrap}
              aria-pressed={wrap}
              onClick={() => setWrap(!wrap)}
            >
              <WrapTextIcon />
            </button>
          </>
        )}
        {file.status !== "failed" && (
          <a
            className={ICON_BUTTON}
            href={url}
            download={name}
            aria-label={text.download}
            title={text.download}
          >
            <DownloadIcon />
          </a>
        )}
      </ScreenHeader>

      {file.status === "failed" && <ErrorAlert>{text.loadFailed(file.error)}</ErrorAlert>}
      {file.status === "tooLarge" && (
        <EmptyState message={text.tooLarge(LOCAL_DIFF_MAX_BYTES / 1024 / 1024)} />
      )}
      {file.status === "diff" && (
        <DiffPanes preview={file.preview} wrap={wrap} treeId={treeId} treeShown={treeShown} />
      )}
      {file.status === "text" && <ColoredText text={file.text} />}
    </ScreenFrame>
  );
}

function subscribeWideScreen(listener: () => void) {
  const query = window.matchMedia(WIDE_SCREEN);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function isWideScreen() {
  return window.matchMedia(WIDE_SCREEN).matches;
}

/** 좁은 창에서는 트리를 diff 위에, 넓은 창에서는 diff 왼쪽에 둡니다. 트리와 diff는 각자 스크롤합니다. */
function DiffPanes({
  preview,
  wrap,
  treeId,
  treeShown,
}: {
  preview: DiffPreview;
  wrap: boolean;
  treeId: string;
  treeShown: boolean;
}) {
  const text = useMessages().localDiff;
  const idPrefix = useId();
  const fileId = useCallback((file: number) => `${idPrefix}-file-${file}`, [idPrefix]);
  const tree = useMemo(() => diffFileTree(preview.files.map((file) => file.path)), [preview]);
  const message = diffCommitMessage(preview.before, preview.after);

  return (
    <div className="code-colors flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
      {/* 파일 줄의 sr-only 설명은 position: absolute라서, nav가 relative여야 nav의 스크롤 영역 안에서 잘립니다.
          relative가 없으면 트리 아래쪽 설명이 문서 높이를 늘려, 파일을 누를 때 문서 전체가 함께 스크롤됩니다. */}
      <nav
        id={treeId}
        aria-label={text.files}
        hidden={!treeShown}
        className="surface relative max-h-[40%] shrink-0 overflow-auto p-2 md:max-h-none md:w-72"
      >
        {message && <CommitMessage message={message} />}
        <DiffFileTree
          nodes={tree}
          files={preview.files}
          onOpen={(file) =>
            document.getElementById(fileId(file))?.scrollIntoView({ block: "start" })
          }
        />
      </nav>
      <DiffContents files={preview.files} wrap={wrap} fileId={fileId} />
    </div>
  );
}

/** 커밋 메시지 제목을 보이고, 누르면 나머지 글(메일 머리, 본문, 서명)을 펼칩니다. */
function CommitMessage({ message }: { message: DiffCommitMessage }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <div className="mb-2 border-b border-base-300 pb-2">
      <button
        type="button"
        className="flex w-full items-start gap-1.5 rounded-field px-2 py-1 text-left text-sm font-semibold hover:bg-base-200"
        aria-expanded={open}
        aria-controls={bodyId}
        disabled={!message.body}
        onClick={() => setOpen(!open)}
      >
        {message.body && (
          <ChevronRightIcon
            className={`mt-0.5 shrink-0 text-emphasis-50 transition-transform ${open ? "rotate-90" : ""}`}
          />
        )}
        <span className="wrap-anywhere">{message.title}</span>
      </button>
      {open && (
        <pre
          id={bodyId}
          className="mt-1 px-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-emphasis-70 wrap-anywhere"
        >
          {message.body}
        </pre>
      )}
    </div>
  );
}

/** diff 보기(diffView)를 그려 둡니다. 줄바꿈은 감싼 요소의 class로 바꾸므로, 줄바꿈을 바꿔도 diff를 다시 그리지 않습니다. */
function DiffContents({
  files,
  wrap,
  fileId,
}: {
  files: DiffPreview["files"];
  wrap: boolean;
  fileId: (file: number) => string;
}) {
  const messages = useMessages();
  const host = useRef<HTMLElement>(null);
  useEffect(() => {
    host.current!.replaceChildren(diffView(files, messages.markdownEditor, fileId));
  }, [files, messages, fileId]);
  return (
    <section
      ref={host}
      aria-label={messages.localDiff.changes}
      className={`surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden *:min-h-0 *:flex-1 ${wrap ? DIFF_WRAP_CLASS : ""}`}
    />
  );
}

/**
 * 파일 diff로 나눌 수 없는 글은 본문 펼쳐 보기처럼 줄 부호에 따라 색만 입힌 원문으로 보입니다. 강조를 불러오는 동안에는 원문 그대로 보입니다.
 * 원문 `<pre>`는 키보드로도 넘친 내용을 스크롤할 수 있게 focus를 받습니다.
 */
function ColoredText({ text }: { text: string }) {
  const messages = useMessages();
  const host = useRef<HTMLElement>(null);
  useEffect(() => {
    const pre = document.createElement("pre");
    pre.tabIndex = 0;
    pre.className =
      "min-h-0 flex-1 overflow-auto p-3 font-mono text-[13px] leading-normal whitespace-pre";
    pre.textContent = text;
    host.current!.replaceChildren(pre);
    let active = true;
    void highlightedFileText(text, "diff")
      .then((colored) => active && pre.replaceChildren(colored))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [text]);
  return (
    <section
      ref={host}
      aria-label={messages.localDiff.changes}
      className="code-colors surface flex min-h-0 flex-1 flex-col overflow-hidden"
    />
  );
}
