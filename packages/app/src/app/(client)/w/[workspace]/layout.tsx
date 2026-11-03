import type { Metadata } from "next";
import { Fragment } from "react";
import { WorkspaceNotFoundScreen } from "@/client/ui/screens/workspaces/WorkspaceNotFoundScreen";
import { findRegisteredWorkspace } from "@/server/web/workspaces/registeredWorkspaces";
import { decodeWorkspaceSlug } from "@/shared/contract/workspaces";

/**
 * 등록하지 않은 workspace 주소는 제목을 정하지 않아 루트 layout의 기본 제목을 씁니다.
 * 하위 page가 제목을 정하면(viewer 화면의 파일·폴더 이름) workspace 이름 앞에 붙입니다.
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/w/[workspace]">): Promise<Metadata> {
  const workspace = findRegisteredWorkspace((await params).workspace);
  return workspace
    ? { title: { default: workspace.slug, template: `%s · ${workspace.slug} · beads-desk` } }
    : {};
}

/**
 * 주소의 workspace 이름으로 등록한 workspace를 찾아 그 workspace의 화면을 그립니다. 머리글은 route group의 layout이 정합니다.
 * 같은 탭에서 다른 workspace로 옮기면 key가 바뀌어 화면 상태와 조회를 모두 새로 시작합니다.
 * 이전 workspace에서 연 상세나 받아 둔 데이터가 새 workspace 화면에 남지 않게 하려는 것입니다.
 */
export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[workspace]">) {
  const { workspace: segment } = await params;
  const workspace = findRegisteredWorkspace(segment);
  if (!workspace) return <WorkspaceNotFoundScreen name={decodeWorkspaceSlug(segment) ?? segment} />;
  return <Fragment key={workspace.slug}>{children}</Fragment>;
}
