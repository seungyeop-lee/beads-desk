import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { relationGraph, relationKind } from "./relationGraph";

function issue(id: string): Issue {
  return { id, title: id, status: "open", priority: 2, issueType: "task", createdAt: 0 } as Issue;
}

/** [의존하는 이슈, 상대 이슈, 유형]을 bd의 의존 기록으로 바꿉니다. */
function deps(...records: [string, string, string][]): IssueDependency[] {
  return records.map(([issueId, dependsOnId, type]) => ({ issueId, dependsOnId, type }));
}

const layerIds = (layers: Issue[][]) => layers.map((layer) => layer.map((it) => it.id));

test("blocks, parent-child, related로 이어진 이슈를 한 묶음으로 두고, 관계가 없는 이슈는 개수만 센다", () => {
  const graph = relationGraph(
    [issue("epic"), issue("task"), issue("next"), issue("note"), issue("alone")],
    deps(["task", "epic", "parent-child"], ["next", "task", "blocks"], ["note", "next", "related"]),
  );

  expect(graph.components).toHaveLength(1);
  expect(graph.components[0]?.edges).toEqual([
    { from: "epic", to: "task", type: "parent-child", kind: "parent-child" },
    { from: "task", to: "next", type: "blocks", kind: "blocks" },
    { from: "next", to: "note", type: "related", kind: "related" },
  ]);
  expect(graph.unrelated).toBe(1);
});

test("상대 이슈를 왼쪽 layer에 두고, 방향이 없는 related도 기록한 방향대로 layer를 나눠 선이 거꾸로 돌아가지 않게 한다", () => {
  const graph = relationGraph(
    [issue("found"), issue("origin"), issue("peer")],
    deps(["found", "origin", "discovered-from"], ["peer", "origin", "related"]),
  );

  expect(layerIds(graph.components[0]!.layers)).toEqual([["origin"], ["found", "peer"]]);
});

test("양쪽에서 기록한 related는 한 번만 그리고, 자기 자신이나 목록 밖 이슈와의 관계는 버린다", () => {
  const graph = relationGraph(
    [issue("a"), issue("b")],
    deps(
      ["a", "b", "related"],
      ["b", "a", "related"],
      ["a", "a", "blocks"],
      ["a", "gone", "blocks"],
    ),
  );

  expect(graph.components[0]?.edges).toEqual([
    { from: "b", to: "a", type: "related", kind: "related" },
  ]);
});

test("relates-to는 related로, 그 밖의 유형은 하나로 묶어 선 모양을 정한다", () => {
  expect(relationKind("relates-to")).toBe("related");
  expect(relationKind("discovered-from")).toBe("other");
  expect(relationKind("supersedes")).toBe("other");
  expect(relationKind("blocks")).toBe("blocks");
  expect(relationKind("parent-child")).toBe("parent-child");
});
