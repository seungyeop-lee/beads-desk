import type { IssueStatus } from "@beads-desk/bd/issue";
import { statusChoices } from "@/client/modules/issues/domain/issueStatusChoices";
import { statusLabel, statusTone } from "../issueLabels";
import { useSavedValue } from "./useSavedValue";

type Props = {
  value: string;
  /** 유형에 따라 고를 수 있는 상태가 달라집니다. */
  issueType: string;
  id?: string;
  "aria-label"?: string;
  /** 바꾸는 데 성공하면 true를 돌려줍니다. 실패하면 원래 값으로 되돌립니다. */
  onChange: (status: IssueStatus) => Promise<boolean>;
};

/** 상태 색의 chip 모양으로 그린 select입니다. */
export function StatusSelect({ value, issueType, onChange, ...attributes }: Props) {
  const [shown, show, reset] = useSavedValue(value);
  return (
    <select
      {...attributes}
      className={`chip ${statusTone(shown)}`}
      value={shown}
      onChange={async (event) => {
        const next = event.target.value as IssueStatus;
        show(next);
        if (!(await onChange(next))) reset();
      }}
    >
      {statusChoices(issueType, shown).map((status) => (
        <option key={status} value={status}>
          {statusLabel(status)}
        </option>
      ))}
    </select>
  );
}
