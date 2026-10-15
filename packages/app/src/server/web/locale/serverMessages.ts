import type { Locale } from "@/shared/contract/locale";
import { requestLocale } from "./requestLocale";

const ko = {
  invalidRequest: "요청 형식이 올바르지 않습니다.",
  invalidIssueStatus: "조회할 이슈 상태가 올바르지 않습니다.",
  invalidStaleDays: "오래 방치된 이슈의 기준 일수가 올바르지 않습니다.",
  unknownWorkspace: (root: string) =>
    `등록되지 않은 workspace입니다: ${root}. 그 디렉터리에서 bd-desk start를 실행해 등록해 주세요.`,
};

const MESSAGES: Record<Locale, typeof ko> = {
  ko,
  en: {
    invalidRequest: "The request is malformed.",
    invalidIssueStatus: "The requested issue status is not valid.",
    invalidStaleDays: "The stale threshold in days is not valid.",
    unknownWorkspace: (root) =>
      `This workspace is not registered: ${root}. Run bd-desk start in that directory to register it.`,
  },
};

/** 화면에 보낼 오류 문구를 요청한 브라우저의 언어로 돌려줍니다. bd가 낸 오류 문구는 번역하지 않습니다. */
export async function serverMessages(): Promise<typeof ko> {
  return MESSAGES[await requestLocale()];
}
