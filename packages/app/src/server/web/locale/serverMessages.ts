import type { BdError, BdErrorKind } from "@beads-desk/bd";
import type { Locale } from "@/shared/contract/locale";
import { requestLocale } from "./requestLocale";

const ko = {
  localFileForbidden: "허용 범위 밖의 파일입니다.",
  localFileNotFound: "파일을 찾을 수 없습니다.",
  invalidRequest: "요청 형식이 올바르지 않습니다.",
  invalidIssueStatus: "조회할 이슈 상태가 올바르지 않습니다.",
  invalidStaleDays: "오래 방치된 이슈의 기준 일수가 올바르지 않습니다.",
  emptyDescriptionSearch: "설명 검색어가 비어 있습니다.",
  unknownWorkspace: (root: string) =>
    `등록되지 않은 workspace입니다: ${root}. 그 디렉터리에서 bd-desk start를 실행해 등록해 주세요.`,
  bdErrors: {
    emptyTitle: "제목이 비어 있습니다.",
    noChanges: "바꿀 내용이 없습니다.",
    invalidDeferDate: "보류 날짜는 YYYY-MM-DD 형식이어야 합니다.",
    emptyIssueId: "이슈 id가 비어 있습니다.",
    emptyTargetId: "대상 이슈 id가 비어 있습니다.",
    emptyGateId: "게이트 id가 비어 있습니다.",
    emptyComment: "댓글이 비어 있습니다.",
    emptyResponse: "응답이 비어 있습니다.",
    emptyLabel: "라벨이 비어 있습니다.",
    notAwaitingHumanDecision: "사람 판단을 기다리는 이슈가 아닙니다.",
    emptyDescriptionSearch: "설명 검색어가 비어 있습니다.",
    invalidStaleDays: "기준 일수는 1 이상의 정수여야 합니다.",
    unparsableOutput: "bd 출력을 JSON으로 해석하지 못했습니다.",
    missingCreatedIssueId: "bd create 출력에 이슈 id가 없습니다.",
    missingShownIssue: "bd show 출력에 이슈가 없습니다.",
  } satisfies Record<BdErrorKind, string>,
};

const MESSAGES: Record<Locale, typeof ko> = {
  ko,
  en: {
    localFileForbidden: "This file is outside the allowed roots.",
    localFileNotFound: "The file was not found.",
    invalidRequest: "The request is malformed.",
    invalidIssueStatus: "The requested issue status is not valid.",
    invalidStaleDays: "The stale threshold in days is not valid.",
    emptyDescriptionSearch: "The description search text is empty.",
    unknownWorkspace: (root) =>
      `This workspace is not registered: ${root}. Run bd-desk start in that directory to register it.`,
    bdErrors: {
      emptyTitle: "The title is empty.",
      noChanges: "There is nothing to change.",
      invalidDeferDate: "The defer date must be in YYYY-MM-DD format.",
      emptyIssueId: "The issue ID is empty.",
      emptyTargetId: "The target issue ID is empty.",
      emptyGateId: "The gate ID is empty.",
      emptyComment: "The comment is empty.",
      emptyResponse: "The response is empty.",
      emptyLabel: "The label is empty.",
      notAwaitingHumanDecision: "This issue is not waiting for a human decision.",
      emptyDescriptionSearch: "The description search text is empty.",
      invalidStaleDays: "The threshold in days must be an integer of 1 or more.",
      unparsableOutput: "Could not parse the bd output as JSON.",
      missingCreatedIssueId: "The bd create output has no issue ID.",
      missingShownIssue: "The bd show output has no issue.",
    },
  },
};

/** 화면에 보낼 오류 문구를 요청한 브라우저의 언어로 돌려줍니다. bd가 낸 오류 문구는 번역하지 않습니다. */
export async function serverMessages(): Promise<typeof ko> {
  return MESSAGES[await requestLocale()];
}

/** bd 실행 결과의 오류를 화면에 보낼 문구로 바꿉니다. bd가 남긴 실패 이유는 앞뒤 공백만 덜고, adapter가 판단한 오류는 요청 언어의 문구로 바꿉니다. */
export async function bdErrorMessage(error: BdError): Promise<string> {
  return "message" in error ? error.message.trim() : (await serverMessages()).bdErrors[error.kind];
}
