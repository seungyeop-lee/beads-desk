import { useId } from "react";
import type { AuxiliaryEdge } from "@/client/modules/graph/domain/centerGraph";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { EdgeMarkers, edgeKindsIn, edgeMarkerId, edgeStyle } from "./edgeLook";
import type { GraphLayout } from "./graphLayout";

const SAMPLE = { width: 32, height: 12 };

/** 그래프에 그린 간선 종류만 실제 간선과 같은 선과 화살촉으로 보입니다. 그린 간선이 없으면 보이지 않습니다. */
export function EdgeLegend({
  layout,
  auxiliary = [],
}: {
  layout: GraphLayout;
  auxiliary?: readonly AuxiliaryEdge[];
}) {
  const messages = useMessages();
  const idPrefix = `legend${useId().replace(/\W/g, "")}`;
  const kinds = edgeKindsIn(layout, auxiliary);
  if (kinds.length === 0) return null;
  return (
    <div
      className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-base-content/65"
      aria-label={messages.graph.legend}
    >
      <EdgeMarkers idPrefix={idPrefix} />
      {kinds.map((kind) => {
        const look = { kind, resolved: false };
        const marker = edgeMarkerId(idPrefix, look);
        return (
          <span key={kind} className="flex items-center gap-2">
            <svg
              aria-hidden
              data-edge={kind}
              width={SAMPLE.width}
              height={SAMPLE.height}
              className="shrink-0 overflow-visible"
            >
              <path
                d={`M1,${SAMPLE.height / 2} L${SAMPLE.width - 1},${SAMPLE.height / 2}`}
                fill="none"
                style={edgeStyle(look)}
                markerEnd={marker && `url(#${marker})`}
              />
            </svg>
            {messages.graph.edgeLegend[kind]}
          </span>
        );
      })}
    </div>
  );
}
