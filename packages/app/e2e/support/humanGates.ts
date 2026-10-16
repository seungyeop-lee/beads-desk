import type { BdWorkspace } from "./bdWorkspace";

/** bds-multi가 리뷰를 요청할 때처럼 human gate를 만듭니다. human 라벨은 붙이지 않습니다. */
export async function createHumanGate(
  workspace: BdWorkspace,
  blocks: string,
  reason: string,
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
  return created.id;
}

export async function commentTexts(workspace: BdWorkspace, id: string): Promise<string[]> {
  const comments: { text: string }[] | null = JSON.parse(
    await workspace.bd("comments", id, "--json"),
  );
  return (comments ?? []).map((comment) => comment.text);
}
