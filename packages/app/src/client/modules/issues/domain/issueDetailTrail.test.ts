import { describe, expect, test } from "vitest";
import { nextIssueDetailTrail, type IssueDetailLocation } from "./issueDetailTrail";

function at(issue: string, side: string | null = null): IssueDetailLocation {
  return { issue, side };
}

describe("nextIssueDetailTrail", () => {
  test("처음 연 상세는 돌아갈 곳이 없다", () => {
    expect(nextIssueDetailTrail([], at("a"))).toEqual([at("a")]);
  });

  test("다른 이슈를 주 상세로 열면 기록에 쌓는다", () => {
    expect(nextIssueDetailTrail([at("a", "b")], at("b"))).toEqual([at("a", "b"), at("b")]);
  });

  test("옆 패널만 바뀌면 지금 항목만 고친다", () => {
    expect(nextIssueDetailTrail([at("a"), at("b")], at("b", "c"))).toEqual([at("a"), at("b", "c")]);
  });

  test("바로 앞 이슈로 옮기면 돌아간 것으로 보고 지금 항목을 지운다", () => {
    expect(nextIssueDetailTrail([at("a", "b"), at("b")], at("a", "b"))).toEqual([at("a", "b")]);
  });

  test("두 번 돌아가면 처음 상세만 남는다", () => {
    const trail = [at("a"), at("b"), at("c")];
    const once = nextIssueDetailTrail(trail, at("b"));
    expect(nextIssueDetailTrail(once, at("a"))).toEqual([at("a")]);
  });

  test("상세를 닫으면 기록을 비운다", () => {
    expect(nextIssueDetailTrail([at("a"), at("b")], null)).toEqual([]);
  });
});
