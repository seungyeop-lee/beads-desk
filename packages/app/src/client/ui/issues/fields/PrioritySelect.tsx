import { PRIORITIES, priorityLabel } from "../issueLabels";
import { useSavedValue } from "./useSavedValue";

type Props = {
  value: number | null;
  className: string;
  id?: string;
  "aria-label"?: string;
  /** 바꾸는 데 성공하면 true를 돌려줍니다. 실패하면 원래 값으로 되돌립니다. */
  onChange: (priority: number) => Promise<boolean>;
};

export function PrioritySelect({ value, className, onChange, ...attributes }: Props) {
  const [shown, show, reset] = useSavedValue(value);
  return (
    <select
      {...attributes}
      className={`select ${className}`}
      value={shown ?? ""}
      onChange={async (event) => {
        const next = Number(event.target.value);
        show(next);
        if (!(await onChange(next))) reset();
      }}
    >
      {shown === null && <option value="">없음</option>}
      {PRIORITIES.map((priority) => (
        <option key={priority} value={priority}>
          P{priority} {priorityLabel(priority)}
        </option>
      ))}
    </select>
  );
}
