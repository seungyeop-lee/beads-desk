export const WORKSPACES_PATH = "/api/workspaces";

export type WorkspaceList = {
  /** bd를 실행하는 현재 workspace 디렉터리입니다. */
  current: string;
  /** 고를 수 있는 workspace 디렉터리입니다. 등록한 순서대로 둡니다. */
  workspaces: string[];
};

/** `bd-desk` 명령이 실행 중인 서버에 workspace를 등록할 때 보내는 본문입니다. */
export type RegisterWorkspaceRequest = {
  /** 이 디렉터리나 상위에서 `.beads`가 있는 디렉터리를 등록합니다. */
  path: string;
  /** true이면 등록한 workspace를 현재 workspace로 바꿉니다. */
  select?: boolean;
};
