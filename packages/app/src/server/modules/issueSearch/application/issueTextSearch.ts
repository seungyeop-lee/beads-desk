import { type BdOutcome } from "@beads-desk/bd";
import type { ExportedIssue } from "@beads-desk/bd/issue";
import { searchIssueText } from "@/server/modules/issueSearch/domain/issueTextSearch";
import type { IssueTextMatch } from "@/shared/contract/issueList";

/** 이슈 export를 읽는 port입니다. application은 infra를 import하지 않으므로 호출자가 넘겨줍니다. */
export type IssueExportReader = (workspaceRoot: string) => Promise<BdOutcome<ExportedIssue[]>>;

/** 목록 응답에는 본문 필드와 댓글이 없으므로, 그 내용에서 검색어를 찾은 이슈와 맞은 곳은 따로 돌려줍니다. */
export async function readIssueTextSearch(
  exportedReader: IssueExportReader,
  cwd: string,
  text: string,
): Promise<BdOutcome<IssueTextMatch[]>> {
  const exported = await exportedReader(cwd);
  if (!exported.ok) return exported;
  return { ok: true, value: searchIssueText(exported.value, text) };
}
