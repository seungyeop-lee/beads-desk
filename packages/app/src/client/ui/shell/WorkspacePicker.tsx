import { selectWorkspace } from "@/client/modules/workspace/application/selectWorkspace";
import { useWorkspaces } from "@/client/modules/workspace/application/useWorkspaces";
import { FolderIcon } from "@/client/ui/designSystem/icons";
import { useSavedValue } from "@/client/ui/issues/fields/useSavedValue";

/** workspace가 하나면 이름만, 여럿이면 고를 수 있게 보여 줍니다. 이름은 디렉터리 이름이고 전체 경로는 title로 보입니다. */
export function WorkspacePicker() {
  const { data } = useWorkspaces();
  const [current, show, reset] = useSavedValue(data?.current ?? "");

  if (!data) return null;
  if (data.workspaces.length <= 1) {
    return (
      <span
        className="flex min-w-0 max-w-48 items-center gap-1.5 text-sm text-base-content/60"
        title={data.current}
      >
        <FolderIcon width={15} height={15} className="shrink-0" />
        <span className="truncate">{directoryName(data.current)}</span>
      </span>
    );
  }
  return (
    <label className="relative flex min-w-0 max-w-48 items-center text-base-content/70">
      <FolderIcon width={15} height={15} className="pointer-events-none absolute left-2.5" />
      <select
        className="ghost-select min-w-0 max-w-full pl-8"
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
          }
        }}
      >
        {data.workspaces.map((root) => (
          <option key={root} value={root} title={root}>
            {directoryName(root)}
          </option>
        ))}
      </select>
    </label>
  );
}

function directoryName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}
