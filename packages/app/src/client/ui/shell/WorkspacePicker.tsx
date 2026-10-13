import { usePathname, useRouter } from "next/navigation";
import {
  selectWorkspace,
  useWorkspaces,
} from "@/client/modules/workspace/application/useWorkspaces";
import { useSavedValue } from "@/client/ui/issues/fields/useSavedValue";

/** workspace가 하나면 이름만, 여럿이면 고를 수 있게 보여 줍니다. 이름은 디렉터리 이름이고 전체 경로는 title로 보입니다. */
export function WorkspacePicker() {
  const { data } = useWorkspaces();
  const router = useRouter();
  const pathname = usePathname();
  const [current, show, reset] = useSavedValue(data?.current ?? "");

  if (!data) return null;
  if (data.workspaces.length <= 1) {
    return (
      <span className="text-sm text-base-content/70" title={data.current}>
        {directoryName(data.current)}
      </span>
    );
  }
  return (
    <select
      className="select select-sm w-auto"
      aria-label="workspace"
      title={current}
      value={current}
      onChange={async (event) => {
        const root = event.target.value;
        show(root);
        const result = await selectWorkspace(root);
        if (!result.ok) {
          reset();
          window.alert(result.error);
          return;
        }
        // 열려 있던 이슈 상세는 이전 workspace의 이슈입니다.
        router.replace(pathname, { scroll: false });
      }}
    >
      {data.workspaces.map((root) => (
        <option key={root} value={root} title={root}>
          {directoryName(root)}
        </option>
      ))}
    </select>
  );
}

function directoryName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}
