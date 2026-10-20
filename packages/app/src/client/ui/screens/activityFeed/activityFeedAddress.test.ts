import { expect, test } from "vitest";
import { activityFeedHref, readActivityFeedAddress } from "./activityFeedAddress";

test("고른 날짜 범위를 주소의 from과 to에 남기고, 그 주소에서 같은 범위를 읽는다", () => {
  const href = activityFeedHref({ from: "2026-10-01", to: "2026-10-20" });

  expect(href).toBe("/activity?from=2026-10-01&to=2026-10-20");
  expect(readActivityFeedAddress(new URL(href, "http://localhost").searchParams)).toEqual({
    from: "2026-10-01",
    to: "2026-10-20",
  });
});

test("날짜를 고르지 않으면 query 없는 주소를 만들고, 올바르지 않은 날짜는 고르지 않은 것으로 읽는다", () => {
  expect(activityFeedHref({ from: null, to: null })).toBe("/activity");
  expect(readActivityFeedAddress(new URLSearchParams("from=2026-02-30&to=어제"))).toEqual({
    from: null,
    to: null,
  });
});
