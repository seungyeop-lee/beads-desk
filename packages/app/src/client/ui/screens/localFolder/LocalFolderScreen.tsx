"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocalFolder } from "@/client/modules/localFiles/application/useLocalFolder";
import {
  folderTrail,
  formatFileSize,
  type FolderTrailStep,
} from "@/client/modules/localFiles/domain/localFolderView";
import { localFileLinkUrl } from "@/client/modules/markdown/domain/localMarkdownUrl";
import { useWorkspaceHref, useWorkspaceSlug } from "@/client/ui/address/workspaceAddress";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { FolderIcon } from "@/client/ui/designSystem/icons";
import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import {
  LOCAL_FOLDER_QUERY,
  localFileUrl,
  localFolderScreenPath,
  type LocalFolderEntry,
} from "@/shared/contract/localFiles";

const LINK = "decoration-base-content/30 underline-offset-4 hover:underline";

/**
 * 이슈 본문의 폴더 링크로 연 폴더의 항목을 보여 줍니다. 파일은 본문의 파일 링크처럼 새 탭에서 열고(.diff·.patch는 diff 화면),
 * 하위 폴더는 이 탭에서 옮겨 갑니다.
 * 주소의 base는 처음 링크한 폴더로, 경로 표시줄은 base부터 보여 줍니다. 그보다 위로 가는 링크는 두지 않습니다.
 * 주소를 useSearchParams로 읽으므로 Suspense 안에서 렌더링합니다.
 */
export function LocalFolderScreen() {
  const params = useSearchParams();
  const path = params.get(LOCAL_FOLDER_QUERY.path) ?? "";
  const base = params.get(LOCAL_FOLDER_QUERY.base) ?? path;
  const { listing, error, loading, showMore } = useLocalFolder(path);
  const trail = folderTrail(base, path);
  const messages = useMessages();
  const text = messages.localFolder;

  return (
    <ScreenFrame>
      <ScreenHeader title={trail.at(-1)!.name} count={listing?.total} loading={loading} />
      <FolderTrail base={trail[0]!.path} trail={trail} />

      {error && <ErrorAlert>{text.loadFailed(error)}</ErrorAlert>}

      {listing &&
        (listing.entries.length === 0 ? (
          <EmptyState message={text.empty} />
        ) : (
          // 이름 열은 남는 폭을 차지하되 20rem(표 영역이 더 좁으면 영역 폭)보다 좁아지지 않습니다.
          // 그 폭을 남길 수 없는 좁은 영역에서는 표가 영역보다 넓어지고, 크기·수정 시각 열은 가로로 스크롤해서 봅니다.
          <div className="@container surface min-w-0 overflow-x-auto">
            <table
              aria-label={text.entries}
              className="table [--size-column:7rem] [--modified-at-column:13rem] w-[max(100cqw,min(100cqw,20rem)_+_var(--size-column)_+_var(--modified-at-column))] table-fixed"
            >
              <thead>
                <tr>
                  <th>{text.name}</th>
                  <th className="w-(--size-column) text-right">{text.size}</th>
                  <th className="w-(--modified-at-column)">{text.modifiedAt}</th>
                </tr>
              </thead>
              <tbody>
                {listing.entries.map((entry) => (
                  <EntryRow key={entry.name} entry={entry} base={trail[0]!.path} />
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {listing?.next && (
        <button
          type="button"
          className="btn btn-sm self-center rounded-full border-base-300 bg-base-100 px-6"
          disabled={loading}
          onClick={showMore}
        >
          {text.showMore}
        </button>
      )}
    </ScreenFrame>
  );
}

/** 처음 링크한 폴더는 어느 폴더인지 알 수 있게 전체 경로로, 그 아래 폴더는 이름으로 보입니다. */
function FolderTrail({ base, trail }: { base: string; trail: FolderTrailStep[] }) {
  const workspaceHref = useWorkspaceHref();
  const messages = useMessages();
  return (
    <nav aria-label={messages.localFolder.trail}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-emphasis-60">
        {trail.map((step, index) => {
          const label = index === 0 ? step.path : step.name;
          return (
            <li key={step.path} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index === trail.length - 1 ? (
                <span aria-current="page" className="font-medium wrap-anywhere text-base-content">
                  {label}
                </span>
              ) : (
                <Link
                  className={`wrap-anywhere ${LINK}`}
                  href={workspaceHref(localFolderScreenPath(base, step.path))}
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function EntryRow({ entry, base }: { entry: LocalFolderEntry; base: string }) {
  const locale = useLocale();
  const modifiedAt = new Date(entry.modifiedAt);
  return (
    <tr className="hover:bg-base-200/60">
      <td className="wrap-anywhere">
        <EntryName entry={entry} base={base} />
      </td>
      <td className="text-right text-sm text-emphasis-70 tabular-nums">
        {entry.kind === "file" && formatFileSize(entry.size)}
      </td>
      <td className="text-sm text-emphasis-70 tabular-nums">
        <time dateTime={modifiedAt.toISOString()}>
          {modifiedAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
        </time>
      </td>
    </tr>
  );
}

function EntryName({ entry, base }: { entry: LocalFolderEntry; base: string }) {
  const workspaceHref = useWorkspaceHref();
  const workspace = useWorkspaceSlug();
  const messages = useMessages();
  if (entry.kind === "blocked") {
    return (
      <span className="flex flex-wrap items-center gap-2 text-emphasis-60">
        {entry.name}
        <span className="chip tone-none" title={messages.localFolder.blockedHelp}>
          {messages.localFolder.blocked}
        </span>
      </span>
    );
  }
  if (entry.kind === "folder") {
    return (
      <Link
        className={`inline-flex items-center gap-2 font-medium ${LINK}`}
        href={workspaceHref(localFolderScreenPath(base, entry.path))}
      >
        <FolderIcon className="shrink-0 text-emphasis-50" />
        {entry.name}
      </Link>
    );
  }
  return (
    <a
      className={LINK}
      href={localFileLinkUrl(localFileUrl(entry.path, workspace))}
      target="_blank"
    >
      {entry.name}
    </a>
  );
}
