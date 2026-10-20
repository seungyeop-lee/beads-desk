import type { ExportedIssue, Issue, IssueDetail } from "@beads-desk/bd/issue";

/**
 * 테스트가 기본값이 채워진 이슈를 만드는 팩토리입니다. 바꾸는 필드만 fields에 넘깁니다.
 * Issue에 필드가 늘면 이 기본값이 typecheck 대상이므로, 부분 객체를 `as Issue`로 캐스팅한 테스트처럼 새 필드를 놓치지 않습니다.
 */
export function issue(id: string, fields: Partial<Issue> = {}): Issue {
  return {
    id,
    title: id,
    status: "open",
    priority: 2,
    issueType: "task",
    assignee: null,
    labels: [],
    parent: null,
    dependencyCount: 0,
    dependentCount: 0,
    createdAt: 0,
    updatedAt: 0,
    startedAt: null,
    closedAt: null,
    deferUntil: null,
    ...fields,
  };
}

/** 상세 화면 테스트가 쓰는, 본문과 의존 관계가 비어 있는 이슈 상세를 만듭니다. */
export function issueDetail(id: string, fields: Partial<IssueDetail> = {}): IssueDetail {
  return {
    ...issue(id, fields),
    description: "",
    design: "",
    acceptanceCriteria: "",
    notes: "",
    closeReason: null,
    dependencies: [],
    dependents: [],
    comments: [],
    ...fields,
  };
}

/** `bd export` 레코드를 다루는 테스트가 쓰는, 본문과 댓글이 비어 있는 이슈를 만듭니다. */
export function exportedIssue(id: string, fields: Partial<ExportedIssue> = {}): ExportedIssue {
  return {
    ...issue(id, fields),
    description: "",
    design: "",
    acceptanceCriteria: "",
    notes: "",
    createdBy: "",
    closeReason: null,
    comments: [],
    ...fields,
  };
}
