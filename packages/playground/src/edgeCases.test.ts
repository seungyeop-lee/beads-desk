import { expect, test } from "vitest";
import { acmeIssues } from "@beads-desk/promo/seed/acmeProject";
import { edgeCaseIssues } from "./edgeCases.ts";

const now = new Date(2026, 9, 15, 12, 0).getTime();
const edgeCases = edgeCaseIssues(now, "/tmp/playground/acme-web");
const issues = [...acmeIssues(now), ...edgeCases];

test("acme 데이터와 ID가 겹치지 않는다", () => {
  const ids = issues.map(({ id }) => id);
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
});

test("parent와 의존 관계가 가리키는 이슈가 모두 있다", () => {
  const ids = new Set(issues.map(({ id }) => id));
  const missing = issues.flatMap(({ parent, blockedBy = [], related = [], discoveredFrom }) =>
    [parent, ...blockedBy, ...related, discoveredFrom].filter(
      (id): id is string => id !== undefined && !ids.has(id),
    ),
  );
  expect(missing).toEqual([]);
});

test("모든 시각이 만든 시각부터 지금 사이에 차례대로 놓이고, 미룬 기한은 지금 뒤에 있다", () => {
  const outOfOrder = edgeCases.filter(
    ({ createdAt, startedAt, closedAt, deferUntil, comments = [] }) => {
      const times = [createdAt, startedAt ?? createdAt, closedAt ?? now, now];
      const ordered = times.every((time, index) => index === 0 || times[index - 1]! <= time);
      // 지난 기한은 다음 `bd ready`가 미룬 이슈를 다시 열어 버립니다.
      const deferred = deferUntil === undefined || deferUntil > now;
      return !ordered || !deferred || comments.some(({ at }) => at < createdAt || at > now);
    },
  );
  expect(outOfOrder.map(({ id }) => id)).toEqual([]);
});
