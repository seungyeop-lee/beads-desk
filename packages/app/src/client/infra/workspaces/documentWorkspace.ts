import { workspaceOfPathname } from "@/shared/contract/workspaces";

/**
 * 이 탭이 보는 workspace의 이름입니다. 화면 주소(`/w/<이름>/...`)에서 읽으며, workspace 화면이 아니면 null입니다.
 * 탭마다 다른 workspace를 볼 수 있어서, 서버에 보내는 요청은 이 이름으로 대상 workspace를 알립니다.
 * 이벤트 처리처럼 browser에서만 실행되는 코드에서 부릅니다. 화면을 그리는 코드는 주소의 params를 씁니다.
 */
export function documentWorkspace(): string | null {
  return workspaceOfPathname(location.pathname);
}

/** 이 탭이 화면에 보이고 focus를 가진 동안 보는 workspace의 이름입니다. 사용자가 이 탭을 보고 있지 않으면 null입니다. */
export function attendedWorkspace(): string | null {
  return document.visibilityState === "visible" && document.hasFocus() ? documentWorkspace() : null;
}
