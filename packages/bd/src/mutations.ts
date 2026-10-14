import { isRecord, type IssueStatus } from "./issue";
import { inputError, runBdChecked, runBdJson, type BdError, type BdOutcome } from "./runBd";

// 모든 쓰기 명령은 값을 `--flag=값`으로, id와 본문은 `--` 뒤에 넘깁니다.
// 그래야 -로 시작하는 제목, 댓글, 라벨을 bd가 플래그로 해석하지 않습니다.

export type NewIssue = {
  title: string;
  /** 비워 두면 bd 기본값(task)을 씁니다. */
  issueType?: string;
  /** 비워 두면 bd 기본값(2)을 씁니다. */
  priority?: number;
  description?: string;
  labels?: string[];
};

/** 만든 이슈의 id를 돌려줍니다. */
export async function createIssue(cwd: string, issue: NewIssue): Promise<BdOutcome<string>> {
  const title = issue.title.trim();
  if (title.length === 0) {
    return inputError("제목이 비어 있습니다.");
  }
  const args = ["create", "--json", `--title=${title}`];
  if (issue.issueType) args.push(`--type=${issue.issueType}`);
  if (issue.priority !== undefined) args.push(`--priority=${issue.priority}`);
  if (issue.description) args.push(`--description=${issue.description}`);
  const labels = (issue.labels ?? []).map((label) => label.trim()).filter(Boolean);
  if (labels.length > 0) args.push(`--labels=${labels.join(",")}`);

  const result = await runBdJson(cwd, args, { write: true });
  if (!result.ok) {
    return result;
  }
  return isRecord(result.value) && typeof result.value.id === "string"
    ? { ok: true, value: result.value.id }
    : { ok: false, error: { message: "bd create 출력에 이슈 id가 없습니다.", exitCode: 0 } };
}

/** 빈 문자열은 그 필드를 비웁니다. */
export type IssueFieldChanges = {
  title?: string;
  description?: string;
  design?: string;
  acceptanceCriteria?: string;
  notes?: string;
  priority?: number;
  assignee?: string;
};

const FIELD_FLAGS: Record<keyof IssueFieldChanges, string> = {
  title: "--title",
  description: "--description",
  design: "--design",
  acceptanceCriteria: "--acceptance",
  notes: "--notes",
  priority: "--priority",
  assignee: "--assignee",
};

export async function updateIssueFields(
  cwd: string,
  issueId: string,
  changes: IssueFieldChanges,
): Promise<BdOutcome<null>> {
  if (changes.title !== undefined && changes.title.trim().length === 0) {
    return inputError("제목이 비어 있습니다.");
  }
  const flags = (Object.keys(FIELD_FLAGS) as (keyof IssueFieldChanges)[])
    .filter((field) => changes[field] !== undefined)
    .map((field) => `${FIELD_FLAGS[field]}=${changes[field]}`);
  if (flags.length === 0) {
    return inputError("바꿀 내용이 없습니다.");
  }
  return write(cwd, ["update", ...flags], [issueId]);
}

export type StatusChangeOutcome =
  | BdOutcome<null>
  /** 열린 하위 이슈나 닫히지 않은 선행 이슈가 있어 bd가 닫기를 거부했습니다. force로 다시 요청할 수 있습니다. */
  | { ok: false; closeBlocked: true; error: BdError };

const CLOSE_BLOCKED = /cannot close/i;

export async function setIssueStatus(
  cwd: string,
  issueId: string,
  status: IssueStatus,
  options: { force?: boolean } = {},
): Promise<StatusChangeOutcome> {
  const flags = [`--status=${status}`, ...(options.force ? ["--force"] : [])];
  const result = await write(cwd, ["update", ...flags], [issueId]);
  if (!result.ok && CLOSE_BLOCKED.test(result.error.message)) {
    return { ...result, closeBlocked: true };
  }
  return result;
}

export function addComment(cwd: string, issueId: string, text: string): Promise<BdOutcome<null>> {
  if (text.trim().length === 0) {
    return Promise.resolve(inputError("댓글이 비어 있습니다."));
  }
  return write(cwd, ["comments", "add"], [issueId], [text]);
}

export function addLabel(cwd: string, issueId: string, label: string) {
  return changeLabel(cwd, "add", issueId, label);
}

export function removeLabel(cwd: string, issueId: string, label: string) {
  return changeLabel(cwd, "remove", issueId, label);
}

/** issueId가 dependsOnId에 의존하게 합니다. parent-child는 issueId가 하위 이슈, dependsOnId가 상위 이슈입니다. */
export function addDependency(cwd: string, issueId: string, dependsOnId: string, type: string) {
  return write(cwd, ["dep", "add", `--type=${type}`], [issueId, dependsOnId]);
}

export function removeDependency(cwd: string, issueId: string, dependsOnId: string) {
  return write(cwd, ["dep", "remove"], [issueId, dependsOnId]);
}

/** 이 이슈에 의존하던 이슈는 남기고 의존 관계만 지웁니다. */
export function deleteIssue(cwd: string, issueId: string) {
  return write(cwd, ["delete", "--force"], [issueId]);
}

function changeLabel(
  cwd: string,
  action: "add" | "remove",
  issueId: string,
  label: string,
): Promise<BdOutcome<null>> {
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    return Promise.resolve(inputError("라벨이 비어 있습니다."));
  }
  return write(cwd, ["label", action], [issueId], [trimmed]);
}

/** 빈 id가 있으면 bd를 실행하지 않습니다. values는 id 뒤에 그대로 넘깁니다. */
async function write(
  cwd: string,
  command: string[],
  ids: string[],
  values: string[] = [],
): Promise<BdOutcome<null>> {
  const trimmed = ids.map((id) => id.trim());
  // update처럼 id가 없으면 마지막으로 다룬 이슈를 고치는 명령이 있습니다.
  if (trimmed.some((id) => id.length === 0)) {
    return inputError("이슈 id가 비어 있습니다.");
  }
  const result = await runBdChecked(cwd, [...command, "--", ...trimmed, ...values], {
    write: true,
  });
  return result.ok ? { ok: true, value: null } : result;
}
