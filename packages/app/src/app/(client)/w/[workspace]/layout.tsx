import type { Metadata } from "next";
import { Suspense } from "react";
import { GraphScreen } from "@/client/ui/screens/graph/GraphScreen";
import { WorkspaceNotFoundScreen } from "@/client/ui/screens/workspaces/WorkspaceNotFoundScreen";
import { AppHeader } from "@/client/ui/shell/AppHeader";
import { findRegisteredWorkspace } from "@/server/web/workspaces/registeredWorkspaces";
import { decodeWorkspaceSlug } from "@/shared/contract/workspaces";

/** 등록하지 않은 workspace 주소는 제목을 정하지 않아 루트 layout의 기본 제목을 씁니다. */
export async function generateMetadata({
  params,
}: LayoutProps<"/w/[workspace]">): Promise<Metadata> {
  const workspace = findRegisteredWorkspace((await params).workspace);
  return workspace ? { title: workspace.slug } : {};
}

/**
 * 주소의 workspace 이름으로 등록한 workspace를 찾아 그 workspace의 화면을 그립니다.
 * 같은 탭에서 다른 workspace로 옮기면 key가 바뀌어 화면 상태와 조회를 모두 새로 시작합니다.
 * 이전 workspace에서 연 상세나 받아 둔 데이터가 새 workspace 화면에 남지 않게 하려는 것입니다.
 */
export default async function WorkspaceLayout({ children, params }: LayoutProps<"/w/[workspace]">) {
  const { workspace: segment } = await params;
  const workspace = findRegisteredWorkspace(segment);
  if (!workspace) return <WorkspaceNotFoundScreen name={decodeWorkspaceSlug(segment) ?? segment} />;
  return <WorkspaceScreens key={workspace.slug}>{children}</WorkspaceScreens>;
}

function WorkspaceScreens({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
      <Suspense>
        <GraphScreen />
      </Suspense>
    </>
  );
}
