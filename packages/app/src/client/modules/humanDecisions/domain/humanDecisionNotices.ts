import type { HumanDecisionItem } from "@/shared/contract/humanDecisions";

/** 판단 기다림이 새로 생겼다고 알릴 내용입니다. 새로 생긴 항목이 여러 개면 첫 항목의 제목과 나머지 개수를 담습니다. */
export type HumanDecisionNotice = { workspace: string; firstTitle: string; moreCount: number };

export type HumanDecisionTracker = {
  /**
   * workspace에서 읽은 판단 기다림을 직전에 읽은 목록과 id로 비교해, 처음 보는 id가 있으면 알릴 내용을 돌려줍니다.
   * 수가 아니라 id로 비교하므로, 두 조회 사이에 하나가 닫히고 다른 하나가 생겨도 알립니다.
   * 그 workspace를 처음 읽었으면 비교 기준으로만 남기고 알리지 않아, 새로고침이나 다시 연결할 때 이미 있던 판단 기다림을 다시 알리지 않습니다.
   * attendedWorkspaces는 사용자가 지금 어느 탭에서든 보고 있는 workspace이고, 여기에 든 workspace는 화면에서 이미 보이므로 알리지 않습니다.
   * 알리지 않을 때도 읽은 목록을 다음 비교의 기준으로 삼습니다.
   */
  observe: (
    workspace: string,
    items: readonly HumanDecisionItem[],
    attendedWorkspaces: readonly string[],
  ) => HumanDecisionNotice | null;
  /** watched에 없는 workspace의 기준을 버립니다. 다시 감시하게 되면 그때 읽은 목록이 새 기준이 됩니다. */
  retain: (watched: readonly string[]) => void;
  /** 모든 기준을 버립니다. */
  clear: () => void;
};

export function createHumanDecisionTracker(): HumanDecisionTracker {
  const seen = new Map<string, ReadonlySet<string>>();
  return {
    observe(workspace, items, attendedWorkspaces) {
      const previous = seen.get(workspace);
      seen.set(workspace, new Set(items.map(({ id }) => id)));
      if (!previous || attendedWorkspaces.includes(workspace)) return null;
      const fresh = items.filter(({ id }) => !previous.has(id));
      if (fresh.length === 0) return null;
      return { workspace, firstTitle: fresh[0]!.title, moreCount: fresh.length - 1 };
    },
    retain(watched) {
      for (const workspace of seen.keys()) {
        if (!watched.includes(workspace)) seen.delete(workspace);
      }
    },
    clear() {
      seen.clear();
    },
  };
}
