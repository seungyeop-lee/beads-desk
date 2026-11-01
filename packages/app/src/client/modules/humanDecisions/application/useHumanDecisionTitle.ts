import { useEffect } from "react";
import { decorateDocumentTitle } from "@/client/infra/documentTitle/documentTitle";
import { titleWithHumanDecisionCount } from "@/client/modules/humanDecisions/domain/humanDecisionTitle";

/** 다른 탭을 보고 있어도 판단 기다림이 있는지 알 수 있게, 탭 제목에 판단 기다림 개수를 붙입니다. */
export function useHumanDecisionTitle(count: number) {
  useEffect(
    () => decorateDocumentTitle((title) => titleWithHumanDecisionCount(title, count)),
    [count],
  );
}
