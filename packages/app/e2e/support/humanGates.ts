import type { BdWorkspace } from "./bdWorkspace";

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
