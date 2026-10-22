import { useId } from "react";
import type { AuxiliaryEdge } from "@/client/modules/graph/domain/centerGraph";
import { type EdgeLook, edgeKindsIn } from "@/client/modules/graph/domain/edgeKind";
import { HelpTooltip } from "@/client/ui/designSystem/HelpTooltip";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { EdgeMarkers, edgeMarkerId, edgeStyle } from "./edgeLook";

const SAMPLE = { width: 32, height: 12 };

/**
 * 그래프에 그린 간선 종류만 실제 간선과 같은 선과 화살촉으로 보입니다. 그린 간선이 없으면 보이지 않습니다.
 * 문구는 짧게 두고 자세한 설명은 항목마다 붙인 ? 아이콘의 툴팁으로 보입니다. 툴팁은 범례 아래에 범례의 왼쪽 끝부터 띄웁니다.
 */
export function EdgeLegend({
  edgeLooks,
  auxiliary = [],
}: {
  edgeLooks: readonly EdgeLook[];
  auxiliary?: readonly AuxiliaryEdge[];
}) {
  const messages = useMessages();
  const idPrefix = `legend${useId().replace(/\W/g, "")}`;
  const kinds = edgeKindsIn(edgeLooks, auxiliary);
  if (kinds.length === 0) return null;
  return (
    <div
      className="@container relative flex flex-wrap gap-x-4 gap-y-1 text-xs text-emphasis-70"
      aria-label={messages.graph.legend}
    >
      <EdgeMarkers idPrefix={idPrefix} />
      {kinds.map((kind) => {
        const look = { kind, resolved: false };
        const marker = edgeMarkerId(idPrefix, look);
        return (
          <span key={kind} className="flex items-center gap-1.5">
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
            <HelpTooltip help={messages.graph.edgeLegendHelp[kind]} />
          </span>
        );
      })}
    </div>
  );
}
