import { exportedIssues } from "@beads-desk/bd";
import { readUntilChanged } from "@/server/infra/workspaceChanges/readUntilChanged";

/** workspace의 `bd export` 결과를 읽습니다. DB 비교값이 지난번과 같으면 bd export를 다시 실행하지 않고 지난 결과를 돌려줍니다. */
export const readIssueExport = readUntilChanged(
  Symbol.for("beads-desk.issueExports"),
  exportedIssues,
);
