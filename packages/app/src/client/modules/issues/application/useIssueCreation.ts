import { useState } from "react";
import { createIssueAction } from "@/server/web/issues/issueActions";
import type { NewIssueInput } from "@/shared/contract/issueActions";
import { useIssueWrites, type IssueWrites } from "./useIssueWrites";

/** 새 이슈를 만들어 성공하면 만든 이슈를 엽니다. 실패하면 오류를 화면에 남길 뿐 열지 않습니다. */
export async function createIssueAndOpen(
  writes: IssueWrites,
  input: NewIssueInput,
  open: (issueId: string) => void,
): Promise<boolean> {
  const result = await writes.run((workspace) => createIssueAction(workspace, input));
  if (result.ok) open(result.data);
  return result.ok;
}

/**
 * 새 이슈 만들기 대화상자를 열었다가, 만들면 대화상자를 닫고 만든 이슈로 이동하는 흐름입니다.
 * open은 만든 이슈의 상세로 이동하는 일로, browser에서만 실행되므로 화면이 인자로 넘깁니다.
 */
export function useIssueCreation(open: (issueId: string) => void) {
  const [creating, setCreating] = useState(false);
  const writes = useIssueWrites();
  return {
    creating,
    pending: writes.pending,
    error: writes.error,
    start: () => setCreating(true),
    close: () => setCreating(false),
    create: (input: NewIssueInput) =>
      createIssueAndOpen(writes, input, (issueId) => {
        setCreating(false);
        open(issueId);
      }),
  };
}
