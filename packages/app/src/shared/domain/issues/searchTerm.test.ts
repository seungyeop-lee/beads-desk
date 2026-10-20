import { expect, test } from "vitest";
import { searchTermPattern, splitBySearchTerm } from "./searchTerm";

test("대소문자가 다른 검색어도 맞은 조각으로 나누고, 발췌에 쓰인 글자를 그대로 남긴다", () => {
  expect(splitBySearchTerm("Use a Session token", "session")).toEqual([
    { text: "Use a ", matched: false },
    { text: "Session", matched: true },
    { text: " token", matched: false },
  ]);
});

test("검색어가 두 번 나오면 둘 다 맞은 조각이고, 맞은 조각이 맨 앞이나 맨 끝이어도 빈 조각을 담지 않는다", () => {
  expect(splitBySearchTerm("픽셀 단위로 맞추고 간격은 8픽셀", "픽셀")).toEqual([
    { text: "픽셀", matched: true },
    { text: " 단위로 맞추고 간격은 8", matched: false },
    { text: "픽셀", matched: true },
  ]);
});

test("정규식 특수 문자가 든 검색어는 글자 그대로 찾는다", () => {
  expect(splitBySearchTerm("call fn(a.b) not fn(aXb)", "fn(a.b)")).toEqual([
    { text: "call ", matched: false },
    { text: "fn(a.b)", matched: true },
    { text: " not fn(aXb)", matched: false },
  ]);
  expect(searchTermPattern("fn(a.b)").test("fn(aXb)")).toBe(false);
});

test("검색어가 비었거나 맞는 곳이 없으면 text 전체를 맞지 않는 조각 하나로 돌려준다", () => {
  expect(splitBySearchTerm("여백 기준", "")).toEqual([{ text: "여백 기준", matched: false }]);
  // 서버는 발췌의 연속 공백을 하나로 줄이므로, 공백이 둘인 검색어는 발췌에서 다시 찾지 못합니다.
  expect(splitBySearchTerm("여백 기준", "여백  기준")).toEqual([
    { text: "여백 기준", matched: false },
  ]);
});
