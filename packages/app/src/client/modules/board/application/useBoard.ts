import { readBoard } from "@/client/infra/board/boardApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { BoardItem } from "@/shared/contract/board";

export function useBoard(): WorkspaceReadState<BoardItem[]> {
  return useWorkspaceRead("board", readBoard);
}
