import { NON_WORK_TYPES, type Issue } from "@beads-desk/bd/issue";
import { byNewestThenId } from "@/client/modules/issues/domain/issueSort";
import type { AuxiliaryEdge } from "./centerGraph";
import type { OrderComponent } from "./executionOrder";
import type { CardSections } from "./graphLayout";

export type CenterRelations = {
  center: Issue | undefined;
  issues: Issue[];
  edges: AuxiliaryEdge[];
};

/** 격자에 놓을 노드·간선과 카드 안에 표시할 이슈를 나눕니다. gate 판정에는 이 보기의 blocks 간선만 씁니다. */
export function graphCards(components: OrderComponent[], relations?: CenterRelations) {
  const sections = new Map<string, CardSections>();
  const ownerOf = new Map<string, Issue>();
  function embed(issue: Issue, owner: Issue, section: keyof CardSections) {
    let card = sections.get(owner.id);
    if (!card) {
      card = { gates: [], related: [] };
      sections.set(owner.id, card);
    }
    card[section].push(issue);
    ownerOf.set(issue.id, owner);
  }

  const visibleComponents = components.map((component) => {
    const { layers, edges } = component;
    const issues = layers.flat();
    const gates = issues.filter(({ issueType }) => issueType === "gate");
    if (gates.length === 0) return component;
    const issueOf = new Map(issues.map((issue) => [issue.id, issue]));
    const incoming = new Set(edges.map(({ to }) => to));
    const outgoing = Map.groupBy(edges, ({ from }) => from);
    const embedded = new Set<string>();
    for (const gate of gates) {
      const targets = outgoing.get(gate.id);
      if (incoming.has(gate.id) || targets?.length !== 1) continue;
      const owner = issueOf.get(targets[0]!.to)!;
      if (owner.issueType === "gate") continue;
      embed(gate, owner, "gates");
      embedded.add(gate.id);
    }
    if (embedded.size === 0) return component;
    return {
      layers: layers.map((layer) => layer.filter(({ id }) => !embedded.has(id))),
      edges: edges.filter(({ from }) => !embedded.has(from)),
    };
  });

  let auxiliary: CenterRelations | undefined;
  if (relations?.center && relations.edges.length > 0) {
    const center = ownerOf.get(relations.center.id) ?? relations.center;
    const issues = relations.issues.filter((issue) => {
      if (!NON_WORK_TYPES.has(issue.issueType)) return true;
      embed(issue, center, "related");
      return false;
    });
    auxiliary = { center, issues, edges: relations.edges };
  }
  for (const { gates, related } of sections.values()) {
    gates.sort(bySectionOrder);
    related.sort(bySectionOrder);
  }
  return { components: visibleComponents, sections, ownerOf, auxiliary };
}

function bySectionOrder(a: Issue, b: Issue) {
  return Number(a.status === "closed") - Number(b.status === "closed") || byNewestThenId(a, b);
}
