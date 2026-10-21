/**
 * 컴포넌트 테스트가 React Flow가 그린 요소를 찾는 selector입니다.
 * React Flow가 정한 class라서, React Flow를 올린 뒤 테스트가 요소를 찾지 못하면 이 파일만 고칩니다.
 */
export const reactFlowDom = {
  pane: ".react-flow",
  viewport: ".react-flow__viewport",
  node: ".react-flow__node",
  nodeOf: (id: string) => `.react-flow__node[data-id="${id}"]`,
  /** `data-id`가 간선 id인 간선 묶음입니다. */
  edge: ".react-flow__edge",
  minimapNode: ".react-flow__minimap-node",
  minimapMask: ".react-flow__minimap-mask",
};
