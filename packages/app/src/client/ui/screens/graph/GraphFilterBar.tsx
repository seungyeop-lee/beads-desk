import type { Issue } from "@beads-desk/bd/issue";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { WORK_STATE_ORDER } from "@/client/modules/issues/domain/workState";
import { CheckboxMenu } from "@/client/ui/designSystem/CheckboxMenu";
import { ISSUE_TYPES, typeLabel, typeTone, workStateTone } from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import type { GraphAddress } from "./graphAddress";

type Props = {
  address: GraphAddress;
  /** 상위 에픽으로 고를 수 있는 에픽입니다. */
  epics: Issue[];
  onChange: (changes: Partial<GraphAddress>) => void;
};

/** 의존 그래프의 모든 탭이 함께 쓰는 필터 줄입니다. */
export function GraphFilterBar({ address, epics, onChange }: Props) {
  const messages = useMessages();
  const { epic, types, states, includeClosed } = address;
  // 주소로 연 에픽이 지금 읽은 이슈에 없어도(닫혀서 빠졌을 때 등) 고른 값이 사라지지 않게 남깁니다.
  const missingEpic = epic !== null && !epics.some((candidate) => candidate.id === epic);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className="select select-sm w-72 rounded-full"
        aria-label={messages.graph.epic}
        value={epic ?? ""}
        onChange={(event) => onChange({ epic: event.target.value || null })}
      >
        <option value="">{messages.graph.allEpics}</option>
        {missingEpic && <option value={epic}>{epic}</option>}
        {epics.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {shortIssueId(candidate.id)} {candidate.title}
          </option>
        ))}
      </select>

      <CheckboxMenu
        label={messages.issue.type}
        summary={
          types.length === 0 ? messages.issues.allTypes : messages.issues.typeCount(types.length)
        }
        options={ISSUE_TYPES.map((type) => ({
          value: type,
          label: typeLabel(messages, type),
          tone: typeTone(type),
        }))}
        selected={types}
        onChange={(next) => onChange({ types: next })}
      />

      <CheckboxMenu
        label={messages.graph.states}
        summary={
          states.length === 0 ? messages.graph.allStates : messages.graph.stateCount(states.length)
        }
        options={WORK_STATE_ORDER.map((state) => ({
          value: state,
          label: messages.workStates.labels[state],
          tone: workStateTone(state),
        }))}
        selected={states}
        onChange={(next) => onChange({ states: next })}
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="toggle toggle-sm"
          checked={includeClosed}
          onChange={(event) => onChange({ includeClosed: event.target.checked })}
        />
        {messages.graph.includeClosed}
      </label>
    </div>
  );
}
