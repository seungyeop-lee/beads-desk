export const WORKSPACES_PATH = "/api/workspaces";

/**
 * workspace 이름과 workspace 안의 화면 경로(`/issues?view=ready`)로 화면 주소 `/w/<workspace 이름>/issues?view=ready`를 만듭니다.
 * workspace 이름을 주소의 첫 segment에 바로 두면 `api`, `issues` 같은 앱 경로와 겹치므로 `/w/` 아래에 둡니다.
 */
export function workspaceHref(slug: string, screenPath = "/"): string {
  return `/w/${encodeURIComponent(slug)}${screenPath === "/" ? "" : screenPath}`;
}

/** 화면 주소에서 workspace 이름을 읽습니다. workspace 화면의 주소가 아니면 null입니다. */
export function workspaceOfPathname(pathname: string): string | null {
  const segment = /^\/w\/([^/]+)/.exec(pathname)?.[1];
  if (segment === undefined) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** 화면 주소에서 `/w/<workspace 이름>`을 뗀 workspace 안의 화면 경로입니다. workspace 루트면 `/`입니다. */
export function screenPathOf(pathname: string): string {
  return pathname.replace(/^\/w\/[^/]+/, "") || "/";
}

/** API 요청이 어느 workspace를 대상으로 하는지 화면 주소의 workspace 이름으로 알리는 query 이름입니다. */
export const WORKSPACE_QUERY = "workspace";

/** 서버에 등록한 workspace입니다. */
export type Workspace = {
  /** bd를 실행하는 workspace 디렉터리입니다. */
  root: string;
  /** 화면 주소의 첫 path segment로 쓰는 이름입니다. 등록한 workspace끼리 겹치지 않습니다. */
  slug: string;
};

export type WorkspaceList = {
  /** 등록한 순서대로 둡니다. */
  workspaces: Workspace[];
};

/** `bd-desk` 명령이 실행 중인 서버에 workspace를 등록할 때 보내는 본문입니다. */
export type RegisterWorkspaceRequest = {
  /** bd가 이 디렉터리에서 쓰는 workspace 디렉터리를 등록합니다. git worktree면 worktree 최상위 디렉터리입니다. */
  path: string;
};

/** workspace를 등록한 결과입니다. */
export type RegisteredWorkspace = WorkspaceList & {
  /** 요청한 디렉터리의 workspace입니다. 이미 등록돼 있었으면 그 workspace입니다. */
  registered: Workspace;
};
