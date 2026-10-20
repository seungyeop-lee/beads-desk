import { expect, test } from "vitest";
import { exportedIssue } from "@/shared/domain/issues/issueFixture";
import { searchIssueText } from "./issueTextSearch";

function comment(text: string) {
  return { id: text, author: "agent", text, createdAt: 0 };
}

test("notes에만 있는 한글 낱말로 찾으면 그 이슈와 맞은 필드, 발췌를 돌려준다", () => {
  const issues = [
    exportedIssue("t-1", { notes: "재현은 하루 뒤에 됩니다" }),
    exportedIssue("t-2", { description: "다른 내용" }),
  ];

  expect(searchIssueText(issues, "하루")).toEqual([
    { id: "t-1", hits: [{ field: "notes", excerpt: "재현은 하루 뒤에 됩니다" }] },
  ]);
});

test("댓글에만 있는 한글 낱말로도 찾는다", () => {
  const issues = [
    exportedIssue("t-1", { comments: [comment("첫 댓글"), comment("여백 기준은 8픽셀로 정했다")] }),
  ];

  expect(searchIssueText(issues, "픽셀")).toEqual([
    { id: "t-1", hits: [{ field: "comment", excerpt: "여백 기준은 8픽셀로 정했다" }] },
  ]);
});

test("설계와 수용 기준에서도 찾고, 대소문자를 무시한다", () => {
  const issues = [
    exportedIssue("t-1", { design: "Use a Session token" }),
    exportedIssue("t-2", { acceptanceCriteria: "SESSION expires" }),
  ];

  expect(searchIssueText(issues, "session")).toEqual([
    { id: "t-1", hits: [{ field: "design", excerpt: "Use a Session token" }] },
    { id: "t-2", hits: [{ field: "acceptanceCriteria", excerpt: "SESSION expires" }] },
  ]);
});

test("gate의 설명이나 댓글에만 있는 낱말로는 찾지 않는다", () => {
  const issues = [
    exportedIssue("t-gate", {
      issueType: "gate",
      description: "Ad-hoc gate blocking t-1\n\nReason: 리뷰 보고서",
      comments: [comment("Response: 승인합니다")],
    }),
  ];

  expect(searchIssueText(issues, "리뷰 보고서")).toEqual([]);
  expect(searchIssueText(issues, "승인")).toEqual([]);
});

test("맞은 곳이 많으면 본문 필드, 댓글 순서로 앞의 두 곳만 담는다", () => {
  const issues = [
    exportedIssue("t-1", {
      description: "토큰 설명",
      notes: "토큰 메모",
      comments: [comment("토큰 댓글")],
    }),
  ];

  expect(searchIssueText(issues, "토큰")[0]?.hits).toEqual([
    { field: "description", excerpt: "토큰 설명" },
    { field: "notes", excerpt: "토큰 메모" },
  ]);
});

test("긴 본문은 검색어 앞 8자부터 80자까지 잘라 줄바꿈을 공백으로 바꾸고, 잘라 낸 쪽에 말줄임표를 붙인다", () => {
  const before = "가".repeat(30);
  const after = "나".repeat(100);
  const issues = [exportedIssue("t-1", { description: `${before}\n\n토큰\n${after}` })];

  const [hit] = searchIssueText(issues, "토큰")[0]!.hits;

  expect(hit?.excerpt).toBe(`…${"가".repeat(6)} 토큰 ${"나".repeat(69)}…`);
});

test("검색어의 정규식 특수 문자는 글자 그대로 찾는다", () => {
  const issues = [
    exportedIssue("t-1", { notes: "a.b(c)를 고친다" }),
    exportedIssue("t-2", { notes: "axb(c)" }),
  ];

  expect(searchIssueText(issues, "a.b(c)").map(({ id }) => id)).toEqual(["t-1"]);
});
