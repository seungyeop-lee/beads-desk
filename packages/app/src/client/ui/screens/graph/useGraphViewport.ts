import { type Edge, type Node, type ReactFlowInstance } from "@xyflow/react";
import { type RefObject, useLayoutEffect, useRef } from "react";
import type { GraphLayout } from "@/client/modules/graph/domain/graphLayout";
import {
  type GraphFocus,
  focusViewport,
  initialGraphViewport,
} from "@/client/modules/graph/domain/graphViewport";

/**
 * 그래프 canvas의 viewport를 정합니다. 사용자가 화면을 옮기기 전까지 canvas 크기가 바뀔 때마다 그래프 전체가
 * 다시 중앙에 오고, 한 번 옮긴 뒤에는 사용자가 둔 위치를 유지합니다. onInit은 React Flow 인스턴스가 생기는 순간
 * 초기 viewport를 지정합니다.
 */
export function useGraphViewport<FlowNode extends Node, FlowEdge extends Edge>(
  containerRef: RefObject<HTMLElement | null>,
  layout: GraphLayout,
  focus: GraphFocus | undefined,
  planned: boolean,
) {
  const flowRef = useRef<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);
  const viewRef = useRef({ layout, focus });
  const viewportChosen = useRef(false);
  const preserveViewport = () => {
    viewportChosen.current = true;
  };
  useLayoutEffect(() => {
    viewRef.current = { layout, focus };
  }, [layout, focus]);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // React Flow 인스턴스가 생기기 전에는 center가 setViewport를 건너뛰므로, 초기화를 기다리지 않고 관찰을 시작합니다.
    const center = () => {
      if (viewportChosen.current) return;
      void flowRef.current?.setViewport(
        initialGraphViewport(
          viewRef.current.layout,
          container.clientWidth,
          container.clientHeight,
          planned,
          viewRef.current.focus,
        ),
      );
    };
    const observer = new ResizeObserver(center);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, planned]);
  const onInit = (instance: ReactFlowInstance<FlowNode, FlowEdge>) => {
    flowRef.current = instance;
    const container = containerRef.current!;
    void instance.setViewport(
      initialGraphViewport(layout, container.clientWidth, container.clientHeight, planned, focus),
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
