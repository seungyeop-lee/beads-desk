import type { Page } from "@playwright/test";

/**
 * 다음에 뜨는 확인 창에 답하고 그 문구를 돌려줍니다.
 * 누르는 동안 확인 창이 열리면 답하기 전에는 click이 끝나지 않으므로, 누르기 전에 답을 정해 둡니다.
 */
export function answerNextConfirm(page: Page, accept: boolean): Promise<string> {
  return new Promise((resolve) => {
    page.once("dialog", (dialog) => {
      resolve(dialog.message());
      void (accept ? dialog.accept() : dialog.dismiss());
    });
  });
}
