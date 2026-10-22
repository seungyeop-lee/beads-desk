import { type BdOutcome, dependencyGraph } from "@beads-desk/bd";
import { ancestorEpicsOf } from "@/server/modules/graph/domain/ancestorEpics";
import type { GraphData } from "@/shared/contract/graph";

/** 그래프 화면이 그릴 데이터를 조립합니다. 상위 에픽 모음은 화면을 위해 고르는 규칙이라 app에서 만듭니다. */
export async function readGraphData(cwd: string): Promise<BdOutcome<GraphData>> {
  const result = await dependencyGraph(cwd);
  if (!result.ok) return result;
  return {
    ok: true,
    value: { ...result.value, ancestorEpics: ancestorEpicsOf(result.value.issues) },
  };
}
