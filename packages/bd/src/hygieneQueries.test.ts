import { describe, expect, test } from "vitest";
import { fakeBdWorkspace } from "./fakeBd.testkit";
import { duplicateCandidates, lintFindings, orphanIssues, staleIssues } from "./hygieneQueries";

const fakeBd = fakeBdWorkspace("beads-desk-hygiene-queries-");
const { useFakeBd } = fakeBd;

describe("staleIssues", () => {
  test("기준 일수 동안 갱신되지 않은 이슈를 개수 제한 없이 읽고, 직접 작업하지 않는 decision과 epic은 뺀다", async () => {
    await useFakeBd({
      "stale --json --days 14 --limit 0": {
        stdout: JSON.stringify([
          { id: "d-1", issue_type: "decision", status: "open" },
          { id: "e-1", issue_type: "epic", status: "open" },
          { id: "t-1", issue_type: "task", status: "in_progress" },
        ]),
      },
    });

    const result = await staleIssues(fakeBd.workDir, 14);

    expect(result.ok && result.value.map((issue) => issue.id)).toEqual(["t-1"]);
  });

  test("기준 일수가 1 이상의 정수가 아니면 bd를 실행하지 않고 거부한다", async () => {
    await useFakeBd({});

    expect(await staleIssues(fakeBd.workDir, 0)).toMatchObject({
      ok: false,
      error: { kind: "invalidStaleDays", exitCode: null },
    });
    expect(await staleIssues(fakeBd.workDir, 1.5)).toMatchObject({
      ok: false,
      error: { kind: "invalidStaleDays", exitCode: null },
    });
  });
});

describe("orphanIssues", () => {
  test("커밋 메시지에 언급됐지만 열린 이슈와 마지막 커밋을 읽는다", async () => {
    await useFakeBd({
      "orphans --json": {
        stdout: JSON.stringify([
          {
            issue_id: "t-pfw",
            title: "고아",
            status: "open",
            latest_commit: "8520f14",
            latest_commit_message: "fix: something (t-pfw)",
          },
        ]),
      },
    });

    const result = await orphanIssues(fakeBd.workDir);

    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: "t-pfw",
          title: "고아",
          status: "open",
          latestCommit: "8520f14",
          latestCommitMessage: "fix: something (t-pfw)",
        },
      ],
    });
  });

  test("결과가 없을 때 bd가 출력하는 null은 빈 목록으로 읽는다", async () => {
    await useFakeBd({ "orphans --json": { stdout: "null\n" } });

    expect(await orphanIssues(fakeBd.workDir)).toEqual({ ok: true, value: [] });
  });
});

describe("lintFindings", () => {
  test("필수 섹션이 빠진 이슈와 빠진 섹션을 읽는다", async () => {
    await useFakeBd({
      "lint --json": {
        stdout: JSON.stringify({
          total: 2,
          issues: 1,
          results: [
            {
              id: "t-ocm",
              title: "로그인 링크 오류",
              type: "bug",
              missing: ["## Steps to Reproduce", "## Acceptance Criteria"],
              warnings: 2,
            },
          ],
        }),
      },
    });

    const result = await lintFindings(fakeBd.workDir);

    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: "t-ocm",
          title: "로그인 링크 오류",
          issueType: "bug",
          missing: ["## Steps to Reproduce", "## Acceptance Criteria"],
        },
      ],
    });
  });

  test("결과가 없을 때 bd가 출력하는 results null은 빈 목록으로 읽는다", async () => {
    await useFakeBd({
      "lint --json": { stdout: JSON.stringify({ total: 0, issues: 0, results: null }) },
    });

    expect(await lintFindings(fakeBd.workDir)).toEqual({ ok: true, value: [] });
  });
});

describe("duplicateCandidates", () => {
  test("API key가 필요 없는 mechanical 방식으로 닫히지 않은 중복 후보 쌍을 개수 제한 없이 읽는다", async () => {
    await useFakeBd({
      "find-duplicates --json --method mechanical --limit 0": {
        stdout: JSON.stringify({
          count: 1,
          method: "mechanical",
          pairs: [
            {
              issue_a_id: "t-7xh",
              issue_a_title: "로그인 링크 오류",
              issue_b_id: "t-ocm",
              issue_b_title: "로그인 링크 오류 수정",
              method: "mechanical",
              similarity: 0.8,
            },
          ],
          schema_version: 1,
          threshold: 0.5,
        }),
      },
    });

    const result = await duplicateCandidates(fakeBd.workDir);

    expect(result).toEqual({
      ok: true,
      value: [
        [
          { id: "t-7xh", title: "로그인 링크 오류" },
          { id: "t-ocm", title: "로그인 링크 오류 수정" },
        ],
      ],
    });
  });
});
