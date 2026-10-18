import type { HumanGateSummary } from "@/shared/contract/humanGates";

/** 열린 human gate의 id와 제목입니다. bd list는 gate를 돌려주지 않으므로, 막는 이슈가 gate인지 이 표로 가립니다. */
export function humanGateTitles(gates: readonly HumanGateSummary[]): ReadonlyMap<string, string> {
  return new Map(gates.map(({ gate }) => [gate.id, gate.title]));
}

/** 열린 human gate의 id와 제목입니다. gate 목록을 아직 받지 못했으면 null입니다. */
export type HumanGateTitles = ReadonlyMap<string, string> | null;

/** 이슈를 막고 있는 이슈 한 건입니다. */
export type Blocker = {
  id: string;
  /** 열린 human gate이면 true입니다. 사람이 gate를 승인해야 막힘이 풀립니다. */
  humanGate: boolean;
  /** 제목을 찾지 못하면 undefined입니다. */
  title: string | undefined;
};

/**
 * 막는 이슈 id를 열린 human gate부터 늘어놓습니다. human gate이면 gate 제목을 담습니다.
 * 첫 번째 막는 이슈만 보이는 곳에서도 사람이 승인해야 풀리는 막힘이 가려지지 않게 합니다.
 * gate 목록을 아직 받지 못했으면 어느 막는 이슈가 gate인지 모르므로 빈 목록을 돌려줍니다.
 * 그 사이에 일반 막는 이슈를 먼저 보였다가 gate로 바꾸면, 사람 확인을 기다리는 이슈가 잠깐 다른 이슈를 기다리는 것처럼 보입니다.
 */
export function blockersOf(
  blockedBy: readonly string[],
  gateTitles: HumanGateTitles,
  titleOf: (issueId: string) => string | undefined,
): Blocker[] {
  if (gateTitles === null) return [];
  const blockers = blockedBy.map((id) => {
    const gateTitle = gateTitles.get(id);
    return gateTitle === undefined
      ? { id, humanGate: false, title: titleOf(id) }
      : { id, humanGate: true, title: gateTitle };
  });
  return [...blockers.filter((b) => b.humanGate), ...blockers.filter((b) => !b.humanGate)];
}
