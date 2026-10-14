import { documentMessages } from "@/client/infra/locale/documentLocale";

/** bd가 닫기를 거부했을 때 강제로 닫을지 묻습니다. */
export function confirmForceClose(reason: string): boolean {
  return window.confirm(documentMessages().issueDetail.confirmForceClose(reason));
}
