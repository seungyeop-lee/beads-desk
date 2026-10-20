/** 사람 판단을 기다리는 일의 개수를 돌려주는 경로입니다. 응답 data는 개수 하나입니다. */
export const HUMAN_DECISION_COUNT_PATH = "/api/human-decisions/count";

/** 사람 판단을 기다리는 일의 id와 제목을 돌려주는 경로입니다. 응답 data는 `HumanDecisionItem[]`입니다. */
export const HUMAN_DECISION_ITEMS_PATH = "/api/human-decisions/items";

/** 사람 판단을 기다리는 열린 human gate나 human 라벨 이슈 하나입니다. */
export type HumanDecisionItem = { id: string; title: string };
