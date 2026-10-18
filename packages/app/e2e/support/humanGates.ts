import type { Locator, Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, type BdWorkspace } from "./bdWorkspace";

/** 알림과 목록 변화가 이보다 가까우면 사람은 두 변화를 동시에 일어난 것으로 느낍니다. */
const SIMULTANEOUS_MS = 300;

/**
 * blocks를 막는 human gate를 만듭니다. 제목은 `Review: <blocks>`입니다.
 * humanLabel이면 beads-starter가 리뷰를 요청할 때처럼 gate에 human 라벨도 붙입니다.
 */
export async function createHumanGate(
  workspace: BdWorkspace,
  blocks: string,
  reason: string,
  { humanLabel = false }: { humanLabel?: boolean } = {},
): Promise<string> {
  const created: { id: string } = JSON.parse(
    await workspace.bd(
      "gate",
      "create",
      "--type=human",
      "--blocks",
      blocks,
      "--title",
      `Review: ${blocks}`,
      "--reason",
      reason,
      "--json",
    ),
  );
  if (humanLabel) await workspace.bd("label", "add", created.id, "human");
  return created.id;
}

export async function commentTexts(workspace: BdWorkspace, id: string): Promise<string[]> {
  const comments: { text: string }[] | null = JSON.parse(
    await workspace.bd("comments", id, "--json"),
  );
  return (comments ?? []).map((comment) => comment.text);
}

/**
 * 응답하거나 닫았다는 알림이 뜰 때 그 항목이 판단 기다림 목록에서 이미 빠졌는지 확인합니다.
 * 알림이 보인 것을 확인한 뒤 SIMULTANEOUS_MS 안에 row가 사라지면 통과입니다.
 */
export async function expectRowGoneWhenNotified(page: Page, notice: string, row: Locator) {
  await expect(page.getByRole("status")).toContainText(notice, { timeout: SAVE_TIMEOUT });
  await expect(row).toHaveCount(0, { timeout: SIMULTANEOUS_MS });
}
