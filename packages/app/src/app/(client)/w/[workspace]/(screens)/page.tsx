import { redirect } from "next/navigation";
import { workspaceHref } from "@/shared/contract/workspaces";
import { findRegisteredWorkspace } from "@/server/web/workspaces/registeredWorkspaces";

export default async function WorkspaceHomePage({ params }: PageProps<"/w/[workspace]">) {
  const { workspace: segment } = await params;
  const workspace = findRegisteredWorkspace(segment);
  // 등록하지 않은 이름이면 layout이 안내를 보여 주므로 여기서는 그리지 않습니다.
  if (!workspace) return null;
  redirect(workspaceHref(workspace.slug, "/focus"));
}
