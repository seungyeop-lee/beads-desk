import type { Metadata } from "next";
import { findRegisteredWorkspace } from "@/server/web/workspaces/registeredWorkspaces";
import { pathName } from "@/shared/domain/localFiles/localPaths";

/**
 * viewer 탭은 여러 개를 함께 열어 두므로, 탭 제목을 주소의 path가 가리키는 파일·폴더 이름으로 시작합니다.
 * path query가 여럿이면 화면이 읽는 `useSearchParams().get`처럼 첫 값을 씁니다. 등록하지 않은 workspace 주소는 안내만 보이므로 제목을 정하지 않습니다.
 */
export function viewerTitle(segment: string, path: string | string[] | undefined): Metadata {
  const first = [path ?? []].flat()[0];
  if (!first || !findRegisteredWorkspace(segment)) return {};
  return { title: pathName(first) };
}
