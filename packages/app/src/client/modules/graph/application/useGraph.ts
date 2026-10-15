import { readGraph } from "@/client/infra/graph/graphApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { GraphData } from "@/shared/contract/graph";

/** 의존 그래프 데이터를 읽고, workspace가 바뀌면 다시 읽습니다. 닫힌 이슈 포함 여부를 바꾸면 다시 읽습니다. */
export function useGraph(includeClosed: boolean): WorkspaceReadState<GraphData> {
  return useWorkspaceRead(includeClosed, readGraph);
}
