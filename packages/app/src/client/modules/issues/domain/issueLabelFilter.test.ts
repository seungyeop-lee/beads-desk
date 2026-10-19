import { describe, expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture";
import { labelChoices, NO_LABEL } from "./issueLabelFilter";

describe("labelChoices", () => {
  test("라벨 없음을 맨 앞에 두고, 이슈들에 붙은 라벨을 한 번씩 이름순으로 보인다", () => {
    const issues = [
      issue("demo-1", { labels: ["ui", "triage"] }),
      issue("demo-2"),
      issue("demo-3", { labels: ["api", "ui"] }),
    ];

    expect(labelChoices(issues, [])).toEqual([NO_LABEL, "api", "triage", "ui"]);
  });

  test("고른 라벨이 이슈 어디에도 없어도 선택지에 넣어 해제할 수 있게 한다", () => {
    const issues = [issue("demo-1", { labels: ["ui"] })];

    expect(labelChoices(issues, ["gone", NO_LABEL])).toEqual([NO_LABEL, "gone", "ui"]);
  });
});
