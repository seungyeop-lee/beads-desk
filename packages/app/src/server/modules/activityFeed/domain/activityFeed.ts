import type { ExportedIssue, IssueFieldChange } from "@beads-desk/bd/issue";
import type { JournalRecord } from "@beads-desk/bd/types";
import type {
  ActivityEntry,
  ActivityFeedPage,
  ActivityFeedQuery,
  ActivityKind,
} from "@/shared/contract/activityFeed";
import { BODY_FIELDS } from "@/shared/domain/issues/bodyFields";

/** 피드를 모으는 데 쓰는 이슈 내용입니다. `bd export` 레코드(ExportedIssue)가 이 모양을 채웁니다. 시각은 epoch ms입니다. */
export type FeedSourceIssue = {
  id: string;
  title: string;
  issueType: string;
  createdAt: number;
  /** 기록되지 않았으면 빈 문자열입니다. */
  createdBy: string;
  closedAt: number | null;
  closeReason: string | null;
  comments: readonly { id: string; author: string; text: string; createdAt: number }[];
};

/** 댓글과 닫은 사유는 줄 아래에 두 줄까지만 보이므로, 응답에는 앞에서부터 이만큼만 담습니다. */
const TEXT_LENGTH = 200;

/** 시각이 같은 기록은 한 이슈에서 일어나는 순서(만들기, 수정, 댓글, 닫기)의 역순으로 놓습니다. */
const KIND_ORDER: Record<ActivityKind, number> = {
  closed: 0,
  commented: 1,
  updated: 2,
  created: 3,
};

/** 수정 기록이 보이는 필드입니다. 이슈 상세의 활동 탭이 이름을 붙여 보이는 필드와 같습니다. */
const UPDATE_FIELDS = [
  "title",
  ...BODY_FIELDS,
  "status",
  "priority",
  "issueType",
  "assignee",
  "labels",
  "deferUntil",
] as const satisfies readonly (keyof ExportedIssue)[];

const BODY_FIELD_SET: ReadonlySet<string> = new Set(BODY_FIELDS);

/** 정렬할 때만 쓰는 값을 붙인 기록입니다. sequence는 journal 레코드 번호이고, 시각이 같은 수정 기록을 나중 것부터 놓을 때 씁니다. */
type SortableEntry = { entry: ActivityEntry; sequence: number };

/**
 * 이슈를 만들고 닫고 고치고 댓글을 단 기록을 모아, 조건에 맞는 기록을 새것부터 limit건까지 돌려줍니다.
 * journal은 events journal의 레코드이고, journal이 꺼져 있으면 null입니다.
 * 기록은 bd export에 있는 이슈의 것만 보이고, 이슈 제목은 bd export의 지금 제목을 씁니다.
 * gate는 그 레코드를 만들고 닫고 고친 기록과 거기에 달린 댓글을 모두 뺍니다. gate는 사람의 판단을 받으려고 따로 만드는 레코드라,
 * 작업 이슈의 기록 사이에 섞이면 피드가 같은 판단 요청으로 채워집니다.
 */
export function activityFeedPage(
  issues: readonly FeedSourceIssue[],
  journal: readonly JournalRecord[] | null,
  { since, until, limit }: ActivityFeedQuery,
): ActivityFeedPage {
  const start = since ?? -Infinity;
  const end = until ?? Infinity;
  const shown = new Map(
    issues.filter((issue) => issue.issueType !== "gate").map((issue) => [issue.id, issue]),
  );
  const entries = [
    ...[...shown.values()].flatMap(entriesOf),
    ...updateEntries(journal ?? [], shown),
  ]
    .filter(({ entry }) => entry.at >= start && entry.at < end)
    .sort(newestFirst)
    .map(({ entry }) => entry);
  return {
    entries: entries.slice(0, limit),
    hasMore: entries.length > limit,
    journalEnabled: journal !== null,
  };
}

function entriesOf(issue: FeedSourceIssue): SortableEntry[] {
  const about = { issueId: issue.id, title: issue.title, changes: [] };
  const entries: ActivityEntry[] = [
    {
      key: `${issue.id}:created`,
      kind: "created",
      at: issue.createdAt,
      ...about,
      actor: issue.createdBy || null,
      text: null,
    },
  ];
  if (issue.closedAt !== null) {
    entries.push({
      key: `${issue.id}:closed`,
      kind: "closed",
      at: issue.closedAt,
      ...about,
      actor: null,
      text: excerpt(issue.closeReason ?? ""),
    });
  }
  issue.comments.forEach((comment, index) => {
    entries.push({
      key: `${issue.id}:comment:${comment.id || index}`,
      kind: "commented",
      at: comment.createdAt,
      ...about,
      actor: comment.author || null,
      text: excerpt(comment.text),
    });
  });
  return entries.map((entry) => ({ entry, sequence: 0 }));
}

/**
 * journal의 update 레코드를 수정 기록으로 바꿉니다. 만들기, 닫기, 댓글은 bd export에서 읽으므로 다른 op의 레코드로는 기록을 만들지 않습니다.
 * journal은 바뀐 뒤의 이슈 전체만 남기므로, 바뀐 필드는 같은 이슈의 바로 앞 레코드(op와 관계없이)와 비교해 구합니다.
 * 앞 레코드가 없으면(journal을 켜기 전에 만든 이슈의 첫 수정이거나 보존 기간이 지나 지워졌으면) 바뀐 필드 없이 기록합니다.
 * 앞 레코드와 비교해 보이는 필드가 그대로면 기록하지 않습니다. `bd update --status closed`로 닫은 변경도 bd export의 닫은 기록과 겹치므로 바뀐 필드에서 뺍니다.
 */
function updateEntries(
  journal: readonly JournalRecord[],
  shown: ReadonlyMap<string, FeedSourceIssue>,
): SortableEntry[] {
  const previous = new Map<string, ExportedIssue>();
  const entries: SortableEntry[] = [];
  for (const record of [...journal].sort((a, b) => a.seq - b.seq)) {
    const before = previous.get(record.issueId);
    if (record.issue === null) {
      previous.delete(record.issueId);
      continue;
    }
    previous.set(record.issueId, record.issue);
    const issue = shown.get(record.issueId);
    if (record.op !== "update" || !issue) continue;
    const changes = before ? fieldChanges(before, record.issue) : [];
    if (before && changes.length === 0) continue;
    entries.push({
      entry: {
        key: `${record.issueId}:updated:${record.seq}`,
        kind: "updated",
        at: record.at,
        issueId: record.issueId,
        title: issue.title,
        actor: record.actor || null,
        text: null,
        changes,
      },
      sequence: record.seq,
    });
  }
  return entries;
}

function fieldChanges(before: ExportedIssue, after: ExportedIssue): IssueFieldChange[] {
  return UPDATE_FIELDS.filter(
    (field) =>
      JSON.stringify(before[field]) !== JSON.stringify(after[field]) &&
      !(field === "status" && after.status === "closed"),
  ).map((field) =>
    BODY_FIELD_SET.has(field)
      ? { field, before: null, after: null }
      : { field, before: before[field], after: after[field] },
  );
}

function newestFirst(a: SortableEntry, b: SortableEntry): number {
  return (
    b.entry.at - a.entry.at ||
    KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] ||
    b.sequence - a.sequence ||
    (a.entry.key < b.entry.key ? -1 : a.entry.key > b.entry.key ? 1 : 0)
  );
}

/** 줄바꿈과 연속한 공백을 한 칸으로 줄이고 앞부분만 남깁니다. 내용이 없으면 null입니다. */
function excerpt(text: string): string | null {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat === "") return null;
  const chars = Array.from(flat);
  return chars.length > TEXT_LENGTH ? `${chars.slice(0, TEXT_LENGTH).join("")}…` : flat;
}
