import type { Issue } from "@beads-desk/bd/issue";
import { byPriorityThenCreated } from "@/client/modules/issues/domain/issueListView";
import type { GraphData } from "@/shared/contract/graph";
import { type ExecutionOrder, executionOrder } from "./executionOrder";
import { scopedIssues } from "./graphScope";

/**
 * 단계는 실행 순서의 열입니다. 묶음이 여러 개여도 같은 열의 이슈는 같은 단계입니다.
 * current는 닫히지 않은 이슈가 남은 가장 왼쪽 단계의 번호(0부터)이고, 모든 단계가 끝났으면 null입니다.
 */
export type StageProgress = { total: number; current: number | null };

export type EpicPlan = {
  /** 후손 이슈와 outside 이슈를 blocks 관계로 나눈 실행 순서입니다. */
  order: ExecutionOrder;
  /** 에픽 밖에서 후손 이슈를 직접 막는 이슈의 id입니다. 이 이슈를 막는 이슈는 따라가지 않습니다. */
  outside: ReadonlySet<string>;
  /** 그린 간선이 없어 순서를 정할 수 없는 후손 이슈입니다. 닫히지 않은 이슈를 앞에 둡니다. */
  unordered: Issue[];
  stages: StageProgress;
};

/**
 * 에픽 계획 보기에 그릴 내용을 정합니다. 닫힌 후손 이슈도 단계에 넣어, 원래 계획한 순서 위에서 진행 정도를 읽게 합니다.
 * 에픽 밖 이슈에 막힌 후손 이슈가 첫 단계에 놓이지 않도록, 그 막는 이슈를 단계 계산에 함께 넣습니다.
 */
export function epicPlan(data: GraphData, epicId: string): EpicPlan {
  const descendants = scopedIssues(data, { kind: "epic", id: epicId });
  const outside = outsideBlockers(data, descendants);
  const order = executionOrder([...descendants, ...outside], data.dependencies);
  return {
    order,
    outside: new Set(outside.map((issue) => issue.id)),
    unordered: order.unlinked.toSorted(
      (a, b) =>
        Number(a.status === "closed") - Number(b.status === "closed") ||
        byPriorityThenCreated(a, b),
    ),
    stages: stageProgress(order),
  };
}

function outsideBlockers({ issues, dependencies }: GraphData, descendants: Issue[]): Issue[] {
  const inside = new Set(descendants.map((issue) => issue.id));
  const blockers = new Set(
    dependencies
      .filter(
        ({ issueId, dependsOnId, type }) =>
          type === "blocks" && inside.has(issueId) && !inside.has(dependsOnId),
      )
      .map(({ dependsOnId }) => dependsOnId),
  );
  return issues.filter((issue) => blockers.has(issue.id));
}

function stageProgress({ components }: ExecutionOrder): StageProgress {
  const total = Math.max(0, ...components.map((component) => component.layers.length));
  const stages = Array.from({ length: total }, (_, stage) => stage);
  const current = stages.find((stage) =>
    components.some((component) =>
      component.layers[stage]?.some((issue) => issue.status !== "closed"),
    ),
  );
  return { total, current: current ?? null };
}
