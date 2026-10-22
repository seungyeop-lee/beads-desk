import type { IssueComment, IssueEvent, IssueFieldChange } from "@beads-desk/bd/issue";

/** 활동 기록에서 이벤트 하나가 보이는 줄입니다. 필드 변경 이벤트는 바뀐 필드마다 한 줄입니다. */
export type ActivityLine =
  | { kind: "created" }
  | { kind: "closed"; reason: string | null }
  | { kind: "reopened" }
  | { kind: "field"; change: IssueFieldChange }
  | { kind: "dependencyAdded"; dependsOnId: string; dependencyType: string | null }
  | { kind: "dependencyRemoved"; dependsOnId: string }
  | { kind: "labelAdded"; label: string }
  | { kind: "labelRemoved"; label: string }
  | { kind: "other"; eventType: string; text: string | null };

/** 이슈 상세의 활동 기록 한 줄입니다. 활동 피드의 기록(contract/activityFeed의 ActivityEntry)과 다릅니다. */
export type IssueActivityEntry =
  | { kind: "event"; key: string; actor: string; at: number; lines: ActivityLine[] }
  | { kind: "comment"; key: string; at: number; comment: IssueComment };

/**
 * 변경 이벤트와 댓글을 오래된 것부터 한 목록으로 합칩니다.
 * bd는 이벤트 시각을 초 단위로만 남기고, 같은 초의 이벤트는 시각 정보가 없는 id 순으로 돌려줘 실제 순서를 알 수 없습니다.
 * 다만 이슈를 만든 기록은 다른 기록보다 늦을 수 없으므로 같은 초에서도 맨 앞에 둡니다.
 * 댓글은 이슈 상세의 댓글로 보이므로 commented 이벤트는 뺍니다.
 */
export function issueActivity(
  events: IssueEvent[],
  comments: IssueComment[],
): IssueActivityEntry[] {
  const createdIds = new Set(
    events.filter((event) => event.type === "created").map((event) => event.id),
  );
  const opening = (entry: IssueActivityEntry) =>
    entry.kind === "event" && createdIds.has(entry.key) ? 0 : 1;
  const entries: IssueActivityEntry[] = [
    ...events
      .filter((event) => event.type !== "commented")
      .map((event) => ({
        kind: "event" as const,
        key: event.id,
        actor: event.actor,
        at: event.createdAt,
        lines: activityLines(event),
      })),
    ...comments.map((comment) => ({
      kind: "comment" as const,
      key: comment.id,
      at: comment.createdAt,
      comment,
    })),
  ];
  return entries.sort((a, b) => a.at - b.at || opening(a) - opening(b));
}

function activityLines(event: IssueEvent): ActivityLine[] {
  if (event.changes.length > 0) {
    return event.changes.map((change) => ({ kind: "field", change }));
  }
  if (event.type === "created") return [{ kind: "created" }];
  if (event.type === "closed") return [{ kind: "closed", reason: event.text }];
  if (event.type === "reopened") return [{ kind: "reopened" }];
  if (event.dependency) {
    const { dependsOnId, type } = event.dependency;
    return event.type === "dependency_removed"
      ? [{ kind: "dependencyRemoved", dependsOnId }]
      : [{ kind: "dependencyAdded", dependsOnId, dependencyType: type }];
  }
  if (event.label !== null) {
    return [
      { kind: event.type === "label_removed" ? "labelRemoved" : "labelAdded", label: event.label },
    ];
  }
  return [{ kind: "other", eventType: event.type, text: event.text }];
}
