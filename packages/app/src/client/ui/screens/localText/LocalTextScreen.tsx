"use client";

import { useSearchParams } from "next/navigation";
import {
  LOCAL_TEXT_MAX_BYTES,
  useLocalTextFile,
} from "@/client/modules/localFiles/application/useLocalTextFile";
import { documentMarkdownUrl } from "@/client/modules/markdown/application/markdownAddress";
import { filePreviewFormat } from "@/client/modules/markdown/domain/filePreview";
import { useWorkspaceSlug } from "@/client/ui/address/workspaceAddress";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { MarkdownEditor } from "@/client/ui/markdown/MarkdownEditor";
import { LOCAL_TEXT_QUERY, localFileUrl } from "@/shared/contract/localFiles";
import { pathName } from "@/shared/domain/localFiles/localPaths";

/**
 * 주소의 path가 가리키는 마크다운 파일은 렌더링해서, 그 밖의 텍스트 파일은 원문 그대로 보여 줍니다.
 * 마크다운 안의 상대 경로 링크와 그림은 그 파일이 든 폴더를 기준으로 엽니다.
 * 파일은 파일 API로 한 번 읽고, 파일 시스템이 바뀌어도 다시 읽지 않습니다. 원문 열기는 같은 파일 API 주소를 새 탭에서 엽니다.
 * 주소를 useSearchParams로 읽으므로 Suspense 안에서 렌더링합니다.
 */
export function LocalTextScreen() {
  const path = useSearchParams().get(LOCAL_TEXT_QUERY.path) ?? "";
  const url = localFileUrl(path, useWorkspaceSlug());
  const file = useLocalTextFile(url);
  const text = useMessages().localText;

  return (
    <ScreenFrame>
      <ScreenHeader title={pathName(path)} loading={file.status === "loading"}>
        <a className="btn btn-ghost btn-sm" href={url} target="_blank">
          {text.openRaw}
        </a>
      </ScreenHeader>

      {file.status === "failed" && <ErrorAlert>{text.loadFailed(file.error)}</ErrorAlert>}
      {file.status === "tooLarge" && (
        <EmptyState message={text.tooLarge(LOCAL_TEXT_MAX_BYTES / 1024 / 1024)} />
      )}
      {file.status === "loaded" && file.text === "" && <EmptyState message={text.empty} />}
      {file.status === "loaded" && file.text !== "" && (
        <section className="surface min-w-0 p-6" aria-label={text.contents}>
          {filePreviewFormat(url) === "markdown" ? (
            <MarkdownEditor readOnly openAddress={documentMarkdownUrl(path)} value={file.text} />
          ) : (
            <pre className="font-mono text-[13px] leading-normal whitespace-pre-wrap wrap-anywhere">
              {file.text}
            </pre>
          )}
        </section>
      )}
    </ScreenFrame>
  );
}
