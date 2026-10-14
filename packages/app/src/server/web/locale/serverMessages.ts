import type { Locale } from "@/shared/contract/locale";
import { requestLocale } from "./requestLocale";

const ko = {
  invalidRequest: "요청 형식이 올바르지 않습니다.",
  invalidIssueStatus: "조회할 이슈 상태가 올바르지 않습니다.",
  unknownWorkspace: (root: string) => `등록되지 않은 workspace입니다: ${root}`,
};

const MESSAGES: Record<Locale, typeof ko> = {
  ko,
  en: {
    invalidRequest: "The request is malformed.",
    invalidIssueStatus: "The requested issue status is not valid.",
    unknownWorkspace: (root) => `This workspace is not registered: ${root}`,
  },
};

/** 화면에 보낼 오류 문구를 요청한 브라우저의 언어로 돌려줍니다. bd가 낸 오류 문구는 번역하지 않습니다. */
export async function serverMessages(): Promise<typeof ko> {
  return MESSAGES[await requestLocale()];
}
