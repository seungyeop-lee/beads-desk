import type { CSSProperties } from "react";
import {
  type EdgeKind,
  type EdgeLook,
  ARROW_LENGTH,
  EDGE_KINDS,
  hasArrow,
} from "@/client/modules/graph/domain/edgeKind";

/*
 * 그래프 간선의 색, 굵기, dash, 화살촉은 이 파일에만 정의합니다. 간선과 범례 샘플이 모두 여기서 값을 읽어야 둘이 어긋나지 않습니다.
 * 색은 모두 배경 대비 3:1 이상이고(GraphScreen.browser.test.tsx가 두 테마에서 확인합니다), 선을 opacity로 흐리지 않습니다.
 * 간선 종류와 해소 여부를 정하는 규칙은 domain의 edgeKind가 정합니다.
 */

/** 캔버스 바탕(base-100)에 잉크를 섞은 불투명한 색입니다. 투명한 색을 쓰면 아래 바탕에 따라 대비가 달라집니다. */
const ink = (percent: number) =>
  `color-mix(in oklab, var(--color-base-content) ${percent}%, var(--color-base-100))`;

type KindStroke = {
  color: string;
  /** 해소된 관계의 색입니다. 없으면 해소 여부와 관계없이 color로 그립니다. */
  resolvedColor?: string;
  width: number;
  dash?: string;
  linecap?: "round";
  /** "hollow"이면 속이 빈 화살촉을 그립니다. 화살촉을 그리는 종류인지는 domain의 edgeKind가 정합니다. */
  arrow?: "hollow";
};

const KIND_STROKES: Record<EdgeKind, KindStroke> = {
  blocks: { color: ink(75), resolvedColor: ink(50), width: 2 },
  // gate는 종류와 관계없이 굵기로 대기 조건임을 나타내고, 사람 판단을 기다리는 gate만 판단 기다림 화면과 같은 lavender로 칠합니다.
  gate: { color: ink(75), resolvedColor: ink(50), width: 3 },
  humanGate: {
    color: "var(--color-lavender-line)",
    resolvedColor: "color-mix(in oklab, var(--color-lavender-line) 75%, var(--color-base-100))",
    width: 3,
  },
  related: { color: ink(60), width: 1.5, dash: "0 4", linecap: "round" },
  discovered: { color: ink(60), width: 1.5, dash: "6 4", arrow: "hollow" },
};

/** 화살촉은 선 굵기와 관계없이 같은 크기로 그리고, 뾰족한 끝을 선의 끝점에 맞춥니다. */
const ARROW = { width: ARROW_LENGTH, height: 10, path: "M0,0 L12,5 L0,10 Z" };
const HOLLOW_ARROW_STROKE = 1.5;

function strokeColor({ kind, resolved }: EdgeLook): string {
  const stroke = KIND_STROKES[kind];
  return resolved ? (stroke.resolvedColor ?? stroke.color) : stroke.color;
}

/** 간선 path에 그대로 넘기는 선 style입니다. */
export function edgeStyle(look: EdgeLook): CSSProperties {
  const { width, dash, linecap } = KIND_STROKES[look.kind];
  return {
    stroke: strokeColor(look),
    strokeWidth: width,
    strokeDasharray: dash,
    strokeLinecap: linecap,
  };
}

/** 이 표현의 화살촉 marker id입니다. 화살촉이 없는 종류는 undefined입니다. */
export function edgeMarkerId(idPrefix: string, look: EdgeLook): string | undefined {
  if (!hasArrow(look.kind)) return undefined;
  return `${idPrefix}-${look.kind}${look.resolved ? "-resolved" : ""}`;
}

/**
 * 화살촉이 있는 모든 표현의 marker를 정의합니다. 간선이나 범례를 그리는 SVG와 같은 문서에 한 번 두고, edgeMarkerId로 참조합니다.
 * React Flow가 만드는 marker는 기본 색을 inline style로 넣어 CSS 변수로 테마 색을 줄 수 없으므로 직접 정의합니다.
 */
export function EdgeMarkers({ idPrefix }: { idPrefix: string }) {
  const looks = EDGE_KINDS.flatMap((kind): EdgeLook[] =>
    KIND_STROKES[kind].resolvedColor
      ? [
          { kind, resolved: false },
          { kind, resolved: true },
        ]
      : [{ kind, resolved: false }],
  );
  return (
    <svg aria-hidden className="absolute size-0">
      <defs>
        {looks.map((look) => {
          const id = edgeMarkerId(idPrefix, look);
          if (!id) return null;
          const color = strokeColor(look);
          const hollow = KIND_STROKES[look.kind].arrow === "hollow";
          return (
            <marker
              key={id}
              id={id}
              markerUnits="userSpaceOnUse"
              markerWidth={ARROW.width}
              markerHeight={ARROW.height}
              viewBox={`0 0 ${ARROW.width} ${ARROW.height}`}
              refX={ARROW.width}
              refY={ARROW.height / 2}
              orient="auto"
              overflow="visible"
            >
              <path
                d={ARROW.path}
                style={
                  hollow
                    ? {
                        fill: "var(--color-base-100)",
                        stroke: color,
                        strokeWidth: HOLLOW_ARROW_STROKE,
                      }
                    : { fill: color, stroke: "none" }
                }
              />
            </marker>
          );
        })}
      </defs>
    </svg>
  );
}
