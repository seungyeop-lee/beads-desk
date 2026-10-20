import { useParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { screenPathOf, workspaceHref } from "@/shared/contract/workspaces";

/**
 * 이 화면이 보는 workspace의 이름입니다. 화면 주소 `/w/<이름>/...`의 params에서 읽습니다.
 * 등록한 이름에는 `%`가 들어가지 않으므로, params가 percent-encoding된 채로 와도 풀어서 같은 이름을 얻습니다.
 */
export function useWorkspaceSlug(): string {
  const { workspace } = useParams<{ workspace?: string }>();
  if (!workspace) return "";
  try {
    return decodeURIComponent(workspace);
  } catch {
    return workspace;
  }
}

/**
 * workspace 안의 화면 경로(`/issues?view=ready`)를 이 화면이 보는 workspace의 주소로 바꿉니다.
 * 화면 사이를 오가는 주소는 workspace 없이 화면 경로로 만들고, 링크와 router에 넘길 때 이 함수로 바꿉니다.
 */
export function useWorkspaceHref(): (screenPath?: string) => string {
  const slug = useWorkspaceSlug();
  return useCallback((screenPath?: string) => workspaceHref(slug, screenPath), [slug]);
}

/** 지금 주소에서 `/w/<workspace 이름>`을 뗀 화면 경로입니다. workspace 루트면 `/`입니다. */
export function useScreenPathname(): string {
  return screenPathOf(usePathname());
}
