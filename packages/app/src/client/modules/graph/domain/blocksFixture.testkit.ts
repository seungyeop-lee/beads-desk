import type { IssueDependency } from "@beads-desk/bd/issue";

/** blocker가 끝나야 blocked를 시작할 수 있다는 관계를 bd의 blocks 의존(blocked가 blocker에 의존)으로 바꿉니다. */
export function blocks(...pairs: { blocker: string; blocked: string }[]): IssueDependency[] {
  return pairs.map(({ blocker, blocked }) => ({
    issueId: blocked,
    dependsOnId: blocker,
    type: "blocks",
    createdAt: 0,
  }));
}
