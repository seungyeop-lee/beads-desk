import { describe, expect, test } from "vitest";
import { awaitingHuman } from "./awaitingHuman";

describe("awaitingHuman", () => {
  test("열린 human gate와, 유형과 작업 상태에 상관없이 human 라벨이 붙은 닫히지 않은 이슈를 모아 센다", () => {
    const issues = [
      { id: "question", status: "open", labels: ["human"] },
      { id: "decision", status: "in_progress", labels: ["ops", "human"] },
      { id: "answered", status: "closed", labels: ["human"] },
      { id: "plain", status: "open", labels: [] },
    ];

    const awaiting = awaitingHuman(["gate"], issues);

    expect(awaiting.gates).toEqual(["gate"]);
    expect(awaiting.questions.map(({ id }) => id)).toEqual(["question", "decision"]);
    expect(awaiting.count).toBe(3);
  });

  test("판단할 일이 없으면 0개다", () => {
    expect(awaitingHuman([], [{ status: "open", labels: ["ops"] }]).count).toBe(0);
  });
});
