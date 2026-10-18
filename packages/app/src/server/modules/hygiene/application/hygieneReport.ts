import {
  duplicateCandidates,
  epicStatuses,
  lintFindings,
  orphanIssues,
  type BdOutcome,
} from "@beads-desk/bd";
import type { HygieneReport } from "@/shared/contract/hygiene";
import { isClosableEpic } from "@/shared/domain/epics/closableEpic";

/** 기준 일수와 관계없는 정리 점검을 한 번에 읽습니다. 하나라도 실패하면 일부 카드만 비어 보이지 않도록 오류를 돌려줍니다. */
export async function readHygieneReport(cwd: string): Promise<BdOutcome<HygieneReport>> {
  const [orphans, lint, duplicates, epics] = await Promise.all([
    orphanIssues(cwd),
    lintFindings(cwd),
    duplicateCandidates(cwd),
    epicStatuses(cwd),
  ]);
  if (!orphans.ok) return orphans;
  if (!lint.ok) return lint;
  if (!duplicates.ok) return duplicates;
  if (!epics.ok) return epics;

  return {
    ok: true,
    value: {
      orphans: orphans.value,
      lint: lint.value,
      duplicates: duplicates.value,
      closableEpics: epics.value.filter(isClosableEpic).map(({ epic }) => epic),
    },
  };
}
