import { expect, test } from "vitest";
import { createHumanDecisionTracker } from "./humanDecisionNotices";

const gate = { id: "g-1", title: "배포 승인" };
const question = { id: "q-1", title: "어느 방식으로 할까요" };
const another = { id: "q-2", title: "이름을 바꿀까요" };

test("workspace를 처음 읽은 목록은 기준으로만 남기고 알리지 않는다", () => {
  const tracker = createHumanDecisionTracker();

  expect(tracker.observe("a", [gate, question], [])).toBeNull();
});

test("처음 보는 id가 생기면 그 항목의 제목으로 한 번 알린다", () => {
  const tracker = createHumanDecisionTracker();
  tracker.observe("a", [gate], []);

  expect(tracker.observe("a", [gate, question], [])).toEqual({
    workspace: "a",
    firstTitle: question.title,
    moreCount: 0,
  });
  expect(tracker.observe("a", [gate, question], [])).toBeNull();
});

test("새로 생긴 항목이 여러 개면 첫 제목과 나머지 개수를 담는다", () => {
  const tracker = createHumanDecisionTracker();
  tracker.observe("a", [], []);

  expect(tracker.observe("a", [gate, question, another], [])).toEqual({
    workspace: "a",
    firstTitle: gate.title,
    moreCount: 2,
  });
});

test("항목이 줄기만 하거나 그대로면 알리지 않는다", () => {
  const tracker = createHumanDecisionTracker();
  tracker.observe("a", [gate, question], []);

  expect(tracker.observe("a", [gate, question], [])).toBeNull();
  expect(tracker.observe("a", [gate], [])).toBeNull();
  expect(tracker.observe("a", [], [])).toBeNull();
});

test("하나가 닫히고 다른 하나가 새로 생겨 수가 같아도 알린다", () => {
  const tracker = createHumanDecisionTracker();
  tracker.observe("a", [gate, question], []);

  expect(tracker.observe("a", [gate, another], [])).toEqual({
    workspace: "a",
    firstTitle: another.title,
    moreCount: 0,
  });
});

test("workspace마다 따로 기준을 두고 판단한다", () => {
  const tracker = createHumanDecisionTracker();
  tracker.observe("a", [gate], []);

  // b는 처음 읽으므로 a에 없던 항목이 있어도 기준으로만 남깁니다.
  expect(tracker.observe("b", [gate, question], [])).toBeNull();
  expect(tracker.observe("a", [gate, question], [])).toEqual({
    workspace: "a",
    firstTitle: question.title,
    moreCount: 0,
  });
  expect(tracker.observe("b", [gate, question], [])).toBeNull();
});

test("사용자가 그 workspace를 보고 있으면 알리지 않고, 읽은 목록은 다음 비교의 기준으로 삼는다", () => {
  const tracker = createHumanDecisionTracker();
  tracker.observe("a", [gate], []);

  expect(tracker.observe("a", [gate, question], ["a"])).toBeNull();
  expect(tracker.observe("a", [gate, question], [])).toBeNull();
  expect(tracker.observe("a", [gate, question, another], ["b"])).toEqual({
    workspace: "a",
    firstTitle: another.title,
    moreCount: 0,
  });
});

test("감시하지 않게 된 workspace의 기준을 버려, 다시 감시할 때 읽은 목록은 기준으로만 남긴다", () => {
  const tracker = createHumanDecisionTracker();
  tracker.observe("a", [gate], []);
  tracker.observe("b", [gate], []);

  tracker.retain(["b"]);

  expect(tracker.observe("a", [gate, question], [])).toBeNull();
  expect(tracker.observe("b", [gate, question], [])).not.toBeNull();
});
