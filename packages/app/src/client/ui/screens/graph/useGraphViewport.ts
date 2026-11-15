import { type Edge, type Node, type ReactFlowInstance } from "@xyflow/react";
import { type RefObject, useLayoutEffect, useRef } from "react";
import type { GraphLayout } from "@/client/modules/graph/domain/graphLayout";
import {
  type GraphFocus,
  type GraphViewport,
  focusViewport,
  initialGraphViewport,
  revealIssueViewport,
} from "@/client/modules/graph/domain/graphViewport";

/**
 * 그래프 canvas의 viewport를 정합니다. 사용자가 화면을 옮기기 전까지 canvas 크기가 바뀔 때마다 그래프 전체가
 * 다시 중앙에 오고, 한 번 옮긴 뒤에는 사용자가 둔 위치를 유지합니다. onInit은 React Flow 인스턴스가 생기는 순간
 * 초기 viewport를 지정합니다.
 * 선택된 이슈가 캔버스 경계 밖으로 가려지면 사용자가 직접 옮기기 전까지 가려지지 않는 위치로 이동합니다.
 */
export function useGraphViewport<FlowNode extends Node, FlowEdge extends Edge>(
  containerRef: RefObject<HTMLElement | null>,
  layout: GraphLayout,
  focus: GraphFocus | undefined,
  planned: boolean,
  selectedIssueId?: string,
) {
  const flowRef = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);
  const viewRef = useRef({ layout, focus, selectedIssueId });
  const viewportChosen = useRef(false);
  const manualMoveSinceSelection = useRef(false);
  const prevSelectedRef = useRef<string | undefined>(selectedIssueId);
  const preserveViewport = () => {
    viewportChosen.current = true;
    manualMoveSinceSelection.current = true;
  };
  useLayoutEffect(() => {
    if (prevSelectedRef.current !== selectedIssueId) {
      prevSelectedRef.current = selectedIssueId;
      manualMoveSinceSelection.current = false;
    }
    viewRef.current = { layout, focus, selectedIssueId };
    const flow = flowRef.current;
    const container = containerRef.current;
    if (!flow || !container || !selectedIssueId || manualMoveSinceSelection.current) return;
    applyViewport(
      flow,
      revealIssueViewport(
        flow.getViewport(),
        layout,
        selectedIssueId,
        container.clientWidth,
        container.clientHeight,
      ),
    );
  }, [containerRef, layout, focus, selectedIssueId]);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // React Flow 인스턴스가 생기기 전에는 syncViewport가 setViewport를 건너뛰므로, 초기화를 기다리지 않고 관찰을 시작합니다.
    const syncViewport = () => {
      const flow = flowRef.current;
      if (!flow) return;
      const { layout, focus, selectedIssueId } = viewRef.current;
      if (!viewportChosen.current) {
        applyViewport(
          flow,
          initialOrRevealed(
            layout,
            container.clientWidth,
            container.clientHeight,
            planned,
            focus,
            selectedIssueId,
          ),
        );
        return;
      }
      if (selectedIssueId && !manualMoveSinceSelection.current) {
        applyViewport(
          flow,
          revealIssueViewport(
            flow.getViewport(),
            layout,
            selectedIssueId,
            container.clientWidth,
            container.clientHeight,
          ),
        );
      }
    };
    const observer = new ResizeObserver(syncViewport);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, planned]);
  const onInit = (instance: ReactFlowInstance<FlowNode, FlowEdge>) => {
    flowRef.current = instance;
    const container = containerRef.current!;
    void instance.setViewport(
      initialOrRevealed(
        layout,
        container.clientWidth,
        container.clientHeight,
        planned,
        focus,
        selectedIssueId,
      ),
    );
  };
  const showFocus = () => {
    const flow = flowRef.current;
    const container = containerRef.current;
    if (!flow || !container || !focus) return;
    preserveViewport();
    void flow.setViewport(
      focusViewport(focus, container.clientWidth, container.clientHeight, flow.getZoom()),
    );
  };
  return { onInit, preserveViewport, showFocus };
}

function initialOrRevealed(
  layout: GraphLayout,
  width: number,
  height: number,
  planned: boolean,
  focus: GraphFocus | undefined,
  selectedIssueId?: string,
): GraphViewport {
  const initial = initialGraphViewport(layout, width, height, planned, focus);
  return selectedIssueId
    ? revealIssueViewport(initial, layout, selectedIssueId, width, height)
    : initial;
}

function applyViewport<FlowNode extends Node, FlowEdge extends Edge>(
  flow: ReactFlowInstance<FlowNode, FlowEdge>,
  next: GraphViewport,
) {
  const current = flow.getViewport();
  if (
    Math.abs(current.x - next.x) < 0.01 &&
    Math.abs(current.y - next.y) < 0.01 &&
    Math.abs(current.zoom - next.zoom) < 0.01
  ) {
    return;
  }
  void flow.setViewport(next);
}
