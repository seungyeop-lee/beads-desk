import { isRecord, recordsOf, stringOr } from "./bdJson";
import { isWork, type Issue } from "./issue";
import { queryIssues, withNoLimit } from "./issueList";
import { inputError, runBdJson, type BdOutcome } from "./runBd";

/**
 * days일 넘게 갱신되지 않은 이슈를 읽습니다. decision, epic, milestone은 뺍니다.
 * decision은 열려 있는 동안 유효한 기록이고, epic은 하위 이슈가 진행돼도 갱신 시각이 바뀌지 않아 방치된 것으로 잘못 보이기 때문입니다.
 */
export async function staleIssues(cwd: string, days: number): Promise<BdOutcome<Issue[]>> {
  if (!Number.isInteger(days) || days < 1) {
    return inputError("invalidStaleDays");
  }
  const result = await queryIssues(cwd, withNoLimit(["stale", "--json", "--days", String(days)]));
  return result.ok ? { ok: true, value: result.value.filter(isWork) } : result;
}

export type OrphanIssue = {
  id: string;
  title: string;
  status: string;
  latestCommit: string;
  latestCommitMessage: string;
};

/**
 * 커밋 메시지에 id가 나오지만 아직 닫히지 않은 이슈를 읽습니다. bd는 workspace의 git 커밋 기록을 읽습니다.
 * git 저장소가 아니어도 bd는 실패하지 않고 결과가 없을 때와 같은 null을 출력해, 두 경우를 구별할 수 없습니다.
 */
export async function orphanIssues(cwd: string): Promise<BdOutcome<OrphanIssue[]>> {
  const result = await runBdJson(cwd, ["orphans", "--json"]);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: recordsOf(result.value).map((orphan) => ({
      id: stringOr(orphan.issue_id, ""),
      title: stringOr(orphan.title, ""),
      status: stringOr(orphan.status, ""),
      latestCommit: stringOr(orphan.latest_commit, ""),
      latestCommitMessage: stringOr(orphan.latest_commit_message, ""),
    })),
  };
}

export type LintFinding = {
  id: string;
  title: string;
  issueType: string;
  /** 빠진 섹션의 제목입니다(예: `## Acceptance Criteria`). */
  missing: string[];
};

/** 이슈 유형마다 bd가 권하는 섹션이 빠진 열린 이슈를 읽습니다. */
export async function lintFindings(cwd: string): Promise<BdOutcome<LintFinding[]>> {
  const result = await runBdJson(cwd, ["lint", "--json"]);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: recordsOf(isRecord(result.value) ? result.value.results : null).map((finding) => ({
      id: stringOr(finding.id, ""),
      title: stringOr(finding.title, ""),
      issueType: stringOr(finding.type, ""),
      missing: Array.isArray(finding.missing)
        ? finding.missing.filter((section) => typeof section === "string")
        : [],
    })),
  };
}

export type IssueRef = { id: string; title: string };

/** 제목과 설명이 비슷한 닫히지 않은 이슈 쌍을 읽습니다. ai 방식은 API key가 필요해 mechanical 방식만 씁니다. */
export async function duplicateCandidates(cwd: string): Promise<BdOutcome<[IssueRef, IssueRef][]>> {
  const result = await runBdJson(
    cwd,
    withNoLimit(["find-duplicates", "--json", "--method", "mechanical"]),
  );
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: recordsOf(isRecord(result.value) ? result.value.pairs : null).map((pair) => [
      { id: stringOr(pair.issue_a_id, ""), title: stringOr(pair.issue_a_title, "") },
      { id: stringOr(pair.issue_b_id, ""), title: stringOr(pair.issue_b_title, "") },
    ]),
  };
}
