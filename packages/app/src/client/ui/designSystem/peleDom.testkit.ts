/**
 * 컴포넌트 테스트가 pele가 그린 Mermaid 그림에서 요소를 찾는 selector입니다.
 * pele가 정한 class라서, pele를 올린 뒤 테스트가 요소를 찾지 못하면 이 파일만 고칩니다.
 */
export const peleDom = {
  /** pele가 그린 그림의 svg입니다. */
  diagram: "svg.pele",
  /** 그림 안 노드 하나입니다. */
  node: ".pele-node",
};
