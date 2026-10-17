import { execFile } from "node:child_process";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import {
  addDependency,
  boardIssues,
  claimIssue,
  closeIssue,
  createIssue,
  deferIssue,
  dependencyGraph,
  duplicateCandidates,
  humanDecisionIssues,
  humanGates,
  issueEvents,
  lintFindings,
  listIssues,
  orphanIssues,
  readyIssues,
  respondToHuman,
  showIssue,
} from "..";
import type { BdOutcome } from "../runBd";

// 설치된 실제 bd로 adapter를 실행해, unit test의 fixture가 아니라 지금 bd의 출력과 거부 문구를 해석하는지 확인합니다.
// bd init이 수 초씩 걸려서 workspace 하나를 모든 테스트가 함께 쓰고, 테스트마다 제목이 다른 이슈를 만들어 id로 골라 확인합니다.

const execFileAsync = promisify(execFile);
let cwd: string;

beforeAll(async () => {
  cwd = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-real-bd-")));
  await run("git", "init", "--quiet");
  await run("bd", "init", "--prefix", "real", "--quiet", "--non-interactive");
}, 60_000);

afterAll(async () => {
  await rm(cwd, { recursive: true, force: true, maxRetries: 5 });
});

test("bd lint 결과에서 권장 섹션이 빠진 이슈와 빠진 섹션을 읽는다", async () => {
  const bug = value(await createIssue(cwd, { title: "재현 절차 없는 버그", issueType: "bug" }));

  const finding = value(await lintFindings(cwd)).find(({ id }) => id === bug);
  expect(finding).toMatchObject({ title: "재현 절차 없는 버그", issueType: "bug" });
  expect(finding?.missing.join("\n")).toMatch(/Steps to Reproduce[\s\S]*Acceptance Criteria/);
});

test("bd find-duplicates 결과에서 제목과 설명이 같은 이슈 쌍을 읽는다", async () => {
  const issue = { title: "재설정 링크 오류", description: "재설정 링크를 누르면 404가 납니다." };
  const first = value(await createIssue(cwd, issue));
  const second = value(await createIssue(cwd, issue));

  const pairs = value(await duplicateCandidates(cwd)).map((pair) =>
    pair.map(({ id }) => id).sort(),
  );
  expect(pairs).toContainEqual([first, second].sort());
});

test("bd orphans 결과에서 커밋 메시지에 id가 나온 열린 이슈와 그 커밋을 읽는다", async () => {
  const orphan = value(await createIssue(cwd, { title: "커밋만 하고 닫지 않은 작업" }));
  await run(
    "git",
    "-c",
    "user.name=real-bd",
    "-c",
    "user.email=real-bd@example.com",
    "commit",
    "--allow-empty",
    "--quiet",
    "--message",
    `fix: 링크 고침 (${orphan})`,
  );

  expect(value(await orphanIssues(cwd)).find(({ id }) => id === orphan)).toMatchObject({
    title: "커밋만 하고 닫지 않은 작업",
    status: "open",
    latestCommitMessage: `fix: 링크 고침 (${orphan})`,
  });
});

test("다른 담당자의 이슈를 가져가면 bd의 거부 사유 첫 줄만 돌려준다", async () => {
  const id = value(await createIssue(cwd, { title: "남의 작업" }));
  await run("bd", "update", id, "--assignee", "someone-else");

  const result = await claimIssue(cwd, id);
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.message).toContain('already assigned to "someone-else"');
  expect(result.error.message).not.toContain("\n");
});

test("순환 의존을 맺으면 bd의 거부 사유를 돌려준다", async () => {
  const first = value(await createIssue(cwd, { title: "순환 첫 작업" }));
  const second = value(await createIssue(cwd, { title: "순환 둘째 작업" }));
  value(await addDependency(cwd, first, second, "blocks"));

  const result = await addDependency(cwd, second, first, "blocks");
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.message).toContain("cycle");
});

test("보류하면 bd가 저장한 기한과 사유를 상세에서 읽는다", async () => {
  const tomorrow = value(await createIssue(cwd, { title: "내일까지 미룰 작업" }));
  const dated = value(await createIssue(cwd, { title: "날짜로 미룰 작업" }));
  value(await deferIssue(cwd, tomorrow, { until: "tomorrow", reason: "API 열림 대기" }));
  value(await deferIssue(cwd, dated, { until: { date: "2030-01-15" }, reason: "" }));

  const saved = value(await showIssue(cwd, tomorrow));
  expect(saved).toMatchObject({ status: "deferred", notes: "API 열림 대기" });
  expect(saved.deferUntil! - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
  // bd는 날짜를 bd를 실행한 시간대의 0시로 해석합니다.
  expect(value(await showIssue(cwd, dated)).deferUntil).toBe(new Date(2030, 0, 15).getTime());
});

test("기한이 지난 보류 이슈는 bd ready로 읽을 때 bd가 다시 연다", async () => {
  const id = value(await createIssue(cwd, { title: "기한 지난 작업" }));
  await run("bd", "defer", id, "--until=2020-01-01");

  expect(value(await readyIssues(cwd)).map((issue) => issue.id)).toContain(id);
  expect(value(await showIssue(cwd, id)).status).toBe("open");
});

test("닫힌 기능도 그래프에 담고, 그 아래의 열린 작업이 그 위 에픽에 속한다고 읽는다", async () => {
  const epic = value(await createIssue(cwd, { title: "소속 에픽", issueType: "epic" }));
  const feature = value(
    await createIssue(cwd, { title: "닫힌 소속 기능", issueType: "feature", parent: epic }),
  );
  const task = value(await createIssue(cwd, { title: "소속 작업", parent: feature }));
  // bd는 열린 하위 이슈가 있는 이슈를 force 없이 닫지 않습니다.
  expect((await closeIssue(cwd, feature, { reason: "", force: true })).ok).toBe(true);

  const graph = value(await dependencyGraph(cwd));
  expect(graph.issues.map(({ id }) => id)).toContain(feature);
  expect(graph.ancestorEpics[task]).toEqual([epic]);
});

test("그래프는 상태·await 유형과 무관하게 gate를 읽고 일반 목록·보드·ready에서는 제외한다", async () => {
  const task = value(await createIssue(cwd, { title: "gate 후속 작업" }));
  const gates: string[] = [];
  for (const type of ["human", "human", "gh:pr"]) {
    gates.push(
      JSON.parse(
        await run(
          "bd",
          "gate",
          "create",
          "--type",
          type,
          "--blocks",
          task,
          "--await-id",
          "42",
          "--title",
          `선행 ${type}`,
          "--json",
        ),
      ).id,
    );
  }
  await run("bd", "gate", "resolve", gates[1], "--reason", "확인 완료");

  const graph = value(await dependencyGraph(cwd));
  expect(graph.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: gates[0],
        issueType: "gate",
        status: "open",
      }),
      expect.objectContaining({ id: gates[1], issueType: "gate", status: "closed" }),
      expect.objectContaining({ id: gates[2], issueType: "gate" }),
    ]),
  );
  expect(graph.dependencies).toEqual(
    expect.arrayContaining(
      gates.map((id) => ({
        issueId: task,
        dependsOnId: id,
        type: "blocks",
      })),
    ),
  );
  const ordinary = value(await listIssues(cwd, []));
  const board = value(await boardIssues(cwd)).map(({ issue }) => issue);
  const ready = value(await readyIssues(cwd));
  for (const issues of [ordinary, board, ready]) {
    expect(issues.some(({ id }) => gates.includes(id))).toBe(false);
  }
});

test("bd history 이벤트에서 상태 변경과 관계 추가를 읽는다", async () => {
  const target = value(await createIssue(cwd, { title: "활동 대상 이슈" }));
  const blocker = value(await createIssue(cwd, { title: "먼저 할 이슈" }));
  await run("bd", "update", target, "--status", "in_progress");
  value(await addDependency(cwd, target, blocker, "blocks"));

  const events = value(await issueEvents(cwd, target));
  expect(events.map(({ type }) => type)).toContain("created");
  expect(events.flatMap(({ changes }) => changes)).toContainEqual(
    expect.objectContaining({ field: "status", before: "open", after: "in_progress" }),
  );
  expect(events.map(({ dependency }) => dependency)).toContainEqual({
    dependsOnId: blocker,
    type: "blocks",
  });
});

test("bd gate create로 만든 human gate와 막고 있는 이슈를 읽고, 응답하면 human 라벨이 없어도 gate만 닫힌다", async () => {
  const work = value(await createIssue(cwd, { title: "리뷰 받을 작업" }));
  const gate = await run(
    "bd",
    "gate",
    "create",
    "--blocks",
    work,
    "--title",
    `Review: ${work}`,
    "--reason",
    "로그인 화면 수정",
    "--json",
  );
  const gateId: string = JSON.parse(gate).id;

  expect(value(await humanGates(cwd)).find((found) => found.gate.id === gateId)).toMatchObject({
    gate: { title: `Review: ${work}` },
    reason: "로그인 화면 수정",
    blocks: [{ id: work, title: "리뷰 받을 작업" }],
  });
  expect(value(await showIssue(cwd, work)).dependencies).toContainEqual(
    expect.objectContaining({ id: gateId, issueType: "gate", awaitType: "human" }),
  );

  value(await respondToHuman(cwd, gateId, "배포해도 됩니다"));
  expect(value(await showIssue(cwd, gateId))).toMatchObject({
    status: "closed",
    closeReason: "Responded",
    comments: [expect.objectContaining({ text: "Response: 배포해도 됩니다" })],
  });
  expect(value(await showIssue(cwd, work)).status).toBe("open");
  expect(value(await humanGates(cwd)).map((found) => found.gate.id)).not.toContain(gateId);
});

test("판단을 셀 때 열린 human gate와 human 라벨이 붙은 닫히지 않은 이슈만 읽는다", async () => {
  const work = value(await createIssue(cwd, { title: "판단 개수용 작업" }));
  const question = value(await createIssue(cwd, { title: "열린 질문", labels: ["human"] }));
  const answered = value(await createIssue(cwd, { title: "답한 질문", labels: ["human"] }));
  value(await respondToHuman(cwd, answered, "됐습니다"));
  const deferred = value(await createIssue(cwd, { title: "미룬 질문", labels: ["human"] }));
  value(await deferIssue(cwd, deferred, { until: "tomorrow", reason: "" }));
  const gateId: string = JSON.parse(
    await run("bd", "gate", "create", "--blocks", work, "--title", `Review: ${work}`, "--json"),
  ).id;

  const { gates, labeled } = value(await humanDecisionIssues(cwd));

  expect(gates.map(({ id }) => id)).toContain(gateId);
  expect(labeled.map(({ id }) => id)).toEqual(expect.arrayContaining([question, deferred]));
  expect(labeled.map(({ id }) => id)).not.toContain(answered);
  expect(labeled.map(({ id }) => id)).not.toContain(work);
});

test("셸에 BD_JSON_ENVELOPE, BD_JSON, BEADS_DIR가 있어도 지정한 workspace의 이슈를 읽는다", async () => {
  const id = value(await createIssue(cwd, { title: "셸 설정과 무관한 작업" }));
  const elsewhere = await mkdtemp(join(tmpdir(), "beads-desk-real-bd-elsewhere-"));
  vi.stubEnv("BD_JSON_ENVELOPE", "1");
  vi.stubEnv("BD_JSON", "true");
  vi.stubEnv("BEADS_DIR", join(elsewhere, ".beads"));
  try {
    expect(value(await listIssues(cwd, [])).map((issue) => issue.id)).toContain(id);
    expect(value(await showIssue(cwd, id))).toMatchObject({ title: "셸 설정과 무관한 작업" });
  } finally {
    vi.unstubAllEnvs();
    await rm(elsewhere, { recursive: true, force: true });
  }
});

function value<T>(outcome: BdOutcome<T>): T {
  if (!outcome.ok) throw new Error(outcome.error.message);
  return outcome.value;
}

async function run(command: string, ...args: string[]): Promise<string> {
  return (await execFileAsync(command, args, { cwd })).stdout;
}
