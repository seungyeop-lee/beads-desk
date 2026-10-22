import { useMemo } from "react";
import { readOpenGates } from "@/client/infra/gates/gatesApiClient";
import { gateTitles, type GateTitles } from "@/client/modules/gates/domain/humanGateBlockers";
import { useWorkspaceRead } from "@/client/modules/workspace/application/useWorkspaceRead";

/**
 * 열린 gate의 id마다 제목과 human gate인지입니다. 처음 읽는 중에는 null이라 막힘 표시를 미룹니다.
 * 읽지 못하면 빈 표를 돌려줘, 막는 gate가 일반 막는 이슈처럼 id로 보입니다.
 */
export function useGateTitles(): GateTitles {
  const { data, error } = useWorkspaceRead("openGates", readOpenGates);
  return useMemo(
    () => (data === null && error === null ? null : gateTitles(data ?? [])),
    [data, error],
  );
}
