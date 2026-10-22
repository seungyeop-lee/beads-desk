import { notFound, redirect } from "next/navigation";
import { WorkspaceSelectScreen } from "@/client/ui/screens/workspaces/WorkspaceSelectScreen";
import { registeredWorkspaces } from "@/server/web/workspaces/registeredWorkspaces";
import { workspaceHref } from "@/shared/contract/workspaces";
import { SCREEN_PATHS } from "@/shared/domain/screenPaths";

/**
 * workspace 이름이 없는 예전 주소(`/`, `/issues?view=ready`, 북마크)를 workspace 주소로 잇습니다.
 * 등록한 workspace가 하나면 바로 그 workspace의 같은 화면으로 옮기고, 여럿이면 어느 workspace로 열지 고르게 합니다.
 * 어느 쪽이든 path와 query를 그대로 넘깁니다.
 */
export default async function UnscopedAddressPage({
  params,
  searchParams,
}: PageProps<"/[[...screen]]">) {
  const { screen = [] } = await params;
  const screenPath = `/${screen.join("/")}`;
  if (!SCREEN_PATHS.has(screenPath)) notFound();

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of [value ?? []].flat()) query.append(key, item);
  }
  const hrefOf = (slug: string) =>
    `${workspaceHref(slug, screenPath)}${query.size > 0 ? `?${query}` : ""}`;

  const workspaces = registeredWorkspaces();
  if (workspaces.length === 1) redirect(hrefOf(workspaces[0]!.slug));
  return (
    <WorkspaceSelectScreen
      choices={workspaces.map(({ slug, root }) => ({ slug, root, href: hrefOf(slug) }))}
    />
  );
}
