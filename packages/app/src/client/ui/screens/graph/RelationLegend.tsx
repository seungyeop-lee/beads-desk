import { RELATION_KINDS } from "@/client/modules/graph/domain/relationGraph";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import type { GraphEdge } from "./graphLayout";

/**
 * 그린 간선에 있는 선 모양만 견본 선과 함께 보입니다. 견본 선은 간선과 같은 class로 모양을 정합니다.
 * 넓은 그래프에서 노드를 가리지 않도록 캔버스 밖에 둡니다.
 */
export function RelationLegend({ edges }: { edges: GraphEdge[] }) {
  const messages = useMessages();
  const present = new Set(edges.map((edge) => edge.kind));
  const kinds = RELATION_KINDS.filter((kind) => present.has(kind));
  if (kinds.length === 0) return null;
  return (
    <ul
      aria-label={messages.graph.legend}
      className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-content/60"
    >
      {kinds.map((kind) => (
        <li key={kind} className="flex items-center gap-2">
          <svg width="28" height="6" aria-hidden="true" className={`relation-${kind}`}>
            <line x1="0" y1="3" x2="28" y2="3" className="relation-line" />
          </svg>
          {messages.graph.relationKinds[kind]}
        </li>
      ))}
    </ul>
  );
}
