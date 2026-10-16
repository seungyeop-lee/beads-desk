import { useMemo } from "react";
import { humanGateTitles } from "@/client/modules/humanGates/domain/humanGateBlockers";
import { useHumanGates } from "./useHumanGates";

/** 열린 human gate의 id와 제목입니다. 다 읽기 전이나 읽지 못하면 비어 있어, 막는 gate가 id만으로 보입니다. */
export function useHumanGateTitles(): ReadonlyMap<string, string> {
  const { data } = useHumanGates();
  return useMemo(() => humanGateTitles(data ?? []), [data]);
}
