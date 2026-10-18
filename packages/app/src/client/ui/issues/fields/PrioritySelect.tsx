import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { PRIORITIES } from "@/shared/contract/issueActions";
import { priorityLabel, priorityTone } from "../issueLabels";
import { useSavedValue } from "./useSavedValue";

type Props = {
  value: number | null;
  id?: string;
  "aria-label"?: string;
  /** 바꾸는 데 성공하면 true를 돌려줍니다. 실패하면 원래 값으로 되돌립니다. */
  onChange: (priority: number) => Promise<boolean>;
};

/** 우선순위 색의 chip 모양으로 그린 select입니다. */
export function PrioritySelect({ value, onChange, ...attributes }: Props) {
  const [shown, show, reset] = useSavedValue(value);
  const messages = useMessages();
  return (
    <select
      {...attributes}
      className={`chip ${priorityTone(shown)}`}
      value={shown ?? ""}
      onChange={async (event) => {
        const next = Number(event.target.value);
        show(next);
        if (!(await onChange(next))) reset();
      }}
    >
      {shown === null && <option value="">{messages.common.none}</option>}
      {PRIORITIES.map((priority) => (
        <option key={priority} value={priority}>
          P{priority} {priorityLabel(messages, priority)}
        </option>
      ))}
    </select>
  );
}
