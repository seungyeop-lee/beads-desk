import {
  selectWorkspace,
  useWorkspaces,
} from "@/client/modules/workspace/application/useWorkspaces";
import { useSavedValue } from "@/client/ui/issues/fields/useSavedValue";

/** workspace가 하나면 이름만, 여럿이면 고를 수 있게 보여 줍니다. 이름은 디렉터리 이름이고 전체 경로는 title로 보입니다. */
export function WorkspacePicker() {
  const { data } = useWorkspaces();
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
        }
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
