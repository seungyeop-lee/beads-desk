import { useMemo } from "react";
import {
  humanGateTitles,
  type HumanGateTitles,
} from "@/client/modules/humanGates/domain/humanGateBlockers";
import { useHumanGates } from "./useHumanGates";

/**
 * 열린 human gate의 id와 제목입니다. 처음 읽는 중에는 null이라 막힘 표시를 미룹니다.
 * 읽지 못하면 빈 표를 돌려줘, 막는 gate가 일반 막는 이슈처럼 id로 보입니다.
 */
export function useHumanGateTitles(): HumanGateTitles {
  const { data, error } = useHumanGates();
  return useMemo(
    () => (data === null && error === null ? null : humanGateTitles(data ?? [])),
    [data, error],
  );
}
