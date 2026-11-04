import { WORKSPACE_QUERY } from "./workspaces";

export const LOCAL_FILES_PATH = "/api/local-files";

/** workspace는 허용 범위를 정하는 workspace를 화면 주소의 이름으로 가리킵니다. */
export function localFileUrl(path: string, workspace: string): string {
  return `${LOCAL_FILES_PATH}?${new URLSearchParams({ path, [WORKSPACE_QUERY]: workspace })}`;
}

/** localFileUrl로 만든 주소이면 그 주소가 여는 파일 경로와 workspace 이름을, 아니면 null을 돌려줍니다. */
export function localFileOf(url: string): { path: string; workspace: string } | null {
  const queryStart = url.indexOf("?");
  if (queryStart < 0 || url.slice(0, queryStart) !== LOCAL_FILES_PATH) return null;
  const query = new URLSearchParams(url.slice(queryStart + 1));
  const path = query.get("path");
  return path === null ? null : { path, workspace: query.get(WORKSPACE_QUERY) ?? "" };
}

/** localFileUrl로 만든 주소이면 그 주소가 여는 파일 경로를, 아니면 null을 돌려줍니다. */
export function localFilePathOf(url: string): string | null {
  return localFileOf(url)?.path ?? null;
}

/** 폴더 화면의 workspace 안 경로입니다. 화면 경로 목록(SCREEN_PATHS)에 두지 않아서, 파일 API의 redirect로만 들어옵니다. */
export const LOCAL_FOLDER_SCREEN_PATH = "/files";

/** 폴더 화면 주소의 query 이름입니다. base는 처음 링크한 폴더, path는 지금 보는 폴더입니다. */
export const LOCAL_FOLDER_QUERY = { base: "base", path: "path" } as const;

/** 폴더 화면에서 base부터 path까지 보이는 workspace 안 화면 경로를 만듭니다. */
export function localFolderScreenPath(base: string, path: string): string {
  const query = new URLSearchParams({
    [LOCAL_FOLDER_QUERY.base]: base,
    [LOCAL_FOLDER_QUERY.path]: path,
  });
  return `${LOCAL_FOLDER_SCREEN_PATH}?${query}`;
}

/** diff 화면의 workspace 안 경로입니다. 폴더 화면처럼 화면 경로 목록(SCREEN_PATHS)에 두지 않아서, 링크로만 들어옵니다. */
export const LOCAL_DIFF_SCREEN_PATH = "/diff";

/** diff 화면 주소의 query 이름입니다. path는 보여 줄 .diff·.patch 파일의 절대 경로입니다. */
export const LOCAL_DIFF_QUERY = { path: "path" } as const;

/** path의 .diff·.patch 파일을 보여 주는 diff 화면의 workspace 안 화면 경로를 만듭니다. */
export function localDiffScreenPath(path: string): string {
  return `${LOCAL_DIFF_SCREEN_PATH}?${new URLSearchParams({ [LOCAL_DIFF_QUERY.path]: path })}`;
}

/** 텍스트 화면의 workspace 안 경로입니다. diff 화면처럼 화면 경로 목록(SCREEN_PATHS)에 두지 않아서, 링크로만 들어옵니다. */
export const LOCAL_TEXT_SCREEN_PATH = "/text";

/** 텍스트 화면 주소의 query 이름입니다. path는 보여 줄 마크다운·텍스트 파일의 절대 경로입니다. */
export const LOCAL_TEXT_QUERY = { path: "path" } as const;

/** path의 마크다운·텍스트 파일을 보여 주는 텍스트 화면의 workspace 안 화면 경로를 만듭니다. */
export function localTextScreenPath(path: string): string {
  return `${LOCAL_TEXT_SCREEN_PATH}?${new URLSearchParams({ [LOCAL_TEXT_QUERY.path]: path })}`;
}

export const LOCAL_FOLDER_PATH = "/api/local-folder";

/** 폴더 목록을 한 번에 돌려주는 항목 수입니다. */
export const LOCAL_FOLDER_PAGE_SIZE = 200;

/** path 폴더의 항목을 cursor 다음 순서부터 읽는 API 주소입니다. cursor가 null이면 처음부터 읽습니다. */
export function localFolderApiPath(path: string, cursor: string | null): string {
  const query = new URLSearchParams({ path });
  if (cursor !== null) query.set("cursor", cursor);
  return `${LOCAL_FOLDER_PATH}?${query}`;
}

/**
 * 폴더 목록의 항목입니다. path는 목록을 요청한 폴더 경로에 이름을 붙인 절대 경로입니다.
 * blocked는 허용 루트 밖을 가리키거나 대상이 없는 symlink로, 열 수 없으므로 경로와 크기를 보내지 않습니다.
 * modifiedAt은 OS가 알려 준 수정 시각(ms)이고, blocked는 symlink 자체의 수정 시각입니다.
 */
export type LocalFolderEntry =
  | { kind: "folder"; name: string; path: string; modifiedAt: number }
  | { kind: "file"; name: string; path: string; size: number; modifiedAt: number }
  | { kind: "blocked"; name: string; modifiedAt: number };

export type LocalFolderPage = {
  /** 폴더를 먼저, 폴더와 나머지 항목을 각각 수정 시각 최신순으로 둡니다. 수정 시각이 같으면 이름순입니다. */
  entries: LocalFolderEntry[];
  /** 이름이 `.`으로 시작하는 항목을 뺀 폴더 전체 항목 수입니다. */
  total: number;
  /** 다음 묶음을 읽을 때 넘기는 값입니다. 남은 항목이 없으면 null입니다. */
  next: string | null;
};
