import { useRouter } from "next/navigation";
import { useWorkspaces } from "@/client/modules/workspace/application/useWorkspaces";
import { useScreenPathname, useWorkspaceSlug } from "@/client/ui/address/workspaceAddress";
import { FolderIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { workspaceHref } from "@/shared/contract/workspaces";

/**
 * 이 탭이 보는 workspace의 이름을 보여 주고, 여럿이면 고를 수 있게 합니다. 이름은 화면 주소에 쓰는 이름이고 전체 경로는 title로 보입니다.
 * 고르면 이 탭만 다른 workspace의 같은 화면으로 이동합니다. 다른 탭은 보던 workspace를 그대로 봅니다.
 */
export function WorkspacePicker() {
  const { data } = useWorkspaces();
  const current = useWorkspaceSlug();
  const screenPathname = useScreenPathname();
  const router = useRouter();
  const messages = useMessages();

  const currentRoot = data?.workspaces.find((workspace) => workspace.slug === current)?.root;
  if (!data) return null;
  if (data.workspaces.length <= 1) {
    return (
      <span
        className="flex min-w-0 max-w-48 items-center gap-1.5 text-sm text-base-content/60"
        title={currentRoot}
      >
        <FolderIcon width={15} height={15} className="shrink-0" />
        <span className="truncate">{current}</span>
      </span>
    );
  }
  return (
    <label className="relative flex min-w-0 max-w-48 items-center text-base-content/70">
      <FolderIcon width={15} height={15} className="pointer-events-none absolute left-2.5" />
      <select
        className="ghost-select min-w-0 max-w-full pl-8"
        aria-label={messages.shell.workspace}
        title={currentRoot}
        value={current}
        onChange={(event) => router.push(switchedHref(event.target.value, screenPathname))}
      >
        {data.workspaces.map(({ root, slug }) => (
          <option key={slug} value={slug} title={root}>
            {slug}
          </option>
        ))}
      </select>
    </label>
  );
}

// query의 이슈 id와 그래프 범위는 보던 workspace의 이슈를 가리키므로 넘기지 않습니다.
// 그래프 화면은 범위 없이 열 수 없어 workspace의 첫 화면으로 갑니다.
function switchedHref(slug: string, screenPathname: string): string {
  return workspaceHref(slug, screenPathname === "/graph" ? "/" : screenPathname);
}
