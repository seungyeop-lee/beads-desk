import { ISSUE_STATUSES, type IssueStatus } from "@beads-desk/bd/issue";
import { STATUS_LABELS } from "../issueLabels";
import { useSavedValue } from "./useSavedValue";

type Props = {
  value: string;
  className: string;
  id?: string;
  "aria-label"?: string;
  /** 바꾸는 데 성공하면 true를 돌려줍니다. 실패하면 원래 값으로 되돌립니다. */
  onChange: (status: IssueStatus) => Promise<boolean>;
};

export function StatusSelect({ value, className, onChange, ...attributes }: Props) {
  const [shown, show, reset] = useSavedValue(value);
  return (
    <select
      {...attributes}
      className={`select ${className}`}
      value={shown}
      onChange={async (event) => {
        const next = event.target.value as IssueStatus;
        show(next);
        if (!(await onChange(next))) reset();
      }}
    >
      {!(ISSUE_STATUSES as readonly string[]).includes(shown) && (
        <option value={shown}>{shown}</option>
      )}
      {ISSUE_STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
