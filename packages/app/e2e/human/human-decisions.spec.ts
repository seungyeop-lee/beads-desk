import type { Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { commentTexts, createHumanGate, expectRowGoneWhenNotified } from "../support/humanGates";

test("지금 화면의 판단 기다림 카드로 판단 기다림 화면에 가서 응답하면, 이슈가 닫히고 응답 댓글이 남으며 새로고침하지 않아도 탭의 개수가 사라진다", async ({
  page,
  workspace,
}) => {
  const { question } = await workspace.createIssues({
    question: {
      title: "인증 방식을 정해 주세요",
      type: "task",
      description: "OAuth2와 세션 쿠키 중 무엇으로 할까요?",
      labels: ["human"],
    },
    plain: { title: "평범한 작업", type: "task" },
  });

  await page.goto("focus");
  await page.getByRole("link", { name: "판단 기다림 1", exact: true }).click();
  await expect(page).toHaveURL(/\/human/);
  await expect(screenTab(page, "판단 기다림 1개")).toBeVisible();
  const decision = page.getByRole("region", { name: "인증 방식을 정해 주세요" });
  await expect(decision).toContainText("OAuth2와 세션 쿠키 중 무엇으로 할까요?");

  await decision.getByRole("textbox", { name: "응답", exact: true }).click();
  await page.keyboard.type("OAuth2로 진행해 주세요");
  await decision.getByRole("button", { name: "응답하고 닫기" }).click();
  await expectRowGoneWhenNotified(
    page,
    `${question}에 응답하고 닫았습니다`,
    page.getByRole("button", { name: /인증 방식을 정해 주세요/ }),
  );

  await expect
    .poll(() => workspace.showIssue(question).then((issue) => issue.status), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("closed");
  expect(await commentTexts(workspace, question)).toEqual(["Response: OAuth2로 진행해 주세요"]);
  await expect(page.getByText("판단을 기다리는 이슈가 없습니다.")).toBeVisible();
  await expect(screenTab(page, "판단 기다림")).toBeVisible();
});

test("응답 없이 닫는 동안에는 응답 편집기가 감춰지고 취소하면 적어 둔 응답이 남으며, 닫은 이슈는 판단 기다림 화면에서 사라지고 적은 사유가 닫은 사유로 남는다", async ({
  page,
  workspace,
}) => {
  const { stale } = await workspace.createIssues({
    stale: { title: "더는 필요 없는 질문", type: "task", priority: 1, labels: ["human"] },
    other: { title: "남은 질문", type: "task", priority: 2, labels: ["human"] },
  });

  await page.goto("human");
  await page.getByRole("button", { name: /더는 필요 없는 질문/ }).click();
  const decision = page.getByRole("region", { name: "더는 필요 없는 질문" });
  const response = decision.getByRole("textbox", { name: "응답", exact: true });
  await response.click();
  await page.keyboard.type("아직 정하지 못했습니다");
  await decision.getByRole("button", { name: "응답 없이 닫기" }).click();
  await expect(response).toBeHidden();
  await decision.getByRole("button", { name: "취소" }).click();
  await expect(response).toHaveText("아직 정하지 못했습니다");

  await decision.getByRole("button", { name: "응답 없이 닫기" }).click();
  await decision.getByRole("textbox", { name: "닫는 사유" }).fill("요구 사항이 바뀜");
  await decision.getByRole("button", { name: "응답 없이 닫기" }).click();
  await expectRowGoneWhenNotified(
    page,
    `${stale}을(를) 응답 없이 닫았습니다`,
    page.getByRole("button", { name: /더는 필요 없는 질문/ }),
  );

  await expect
    .poll(() => workspace.showIssue(stale).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Dismissed: 요구 사항이 바뀜");
  await expect(page.getByRole("region", { name: "남은 질문" })).toBeVisible();
});

test("human gate는 human 라벨이 붙어도 확인 요청 묶음에만 보이고, 사유와 막고 있는 작업을 보이며, 오른쪽에 보이는 항목을 주소가 가리키고 새로고침해도 유지되고, 응답해 닫으면 알림과 함께 목록에서 빠져 남은 항목으로 넘어간다", async ({
  page,
  workspace,
}) => {
  const { work, question } = await workspace.createIssues({
    work: {
      title: "로그인 화면 다시 그리기",
      type: "task",
      description: "입력란 배치를 바꿉니다.",
    },
    question: { title: "남은 질문", type: "task", labels: ["human"] },
  });
  const gate = await createHumanGate(workspace, work, "로그인 화면 수정 결과", {
    humanLabel: true,
  });

  // human 라벨이 붙은 gate는 질문 묶음과 탭의 개수에 한 번 더 들어가지 않는다.
  await page.goto("human");
  const gates = page.getByRole("region", { name: "확인 요청", exact: true });
  const questions = page.getByRole("region", { name: "질문", exact: true });
  await expect(gates.getByRole("heading")).toHaveText("확인 요청1");
  await expect(gates.getByRole("button", { name: new RegExp(`Review: ${work}`) })).toBeVisible();
  await expect(questions.getByRole("heading")).toHaveText("질문1");
  await expect(questions.getByRole("button", { name: /남은 질문/ })).toBeVisible();
  await expect(screenTab(page, "판단 기다림 2개")).toBeVisible();

  // 파라미터 없이 들어가면 맨 위 항목인 확인 요청을 자동으로 보이고, 주소도 이를 가리킨다.
  await expect(page).toHaveURL(new RegExp(`item=${gate}$`));
  await expect(page.getByRole("region", { name: `Review: ${work}` })).toBeVisible();

  // 질문을 고르면 주소가 질문을 가리키고, 새로고침해도 같은 항목이 열려 있다.
  await page.getByRole("button", { name: /남은 질문/ }).click();
  await expect(page).toHaveURL(new RegExp(`item=${question}$`));
  await page.reload();
  await expect(page.getByRole("region", { name: "남은 질문" })).toBeVisible();

  // 확인 요청을 다시 고르면 주소가 확인 요청을 가리키고, 사유와 막고 있는 작업의 설명을 보인다.
  await page.getByRole("button", { name: new RegExp(`Review: ${work}`) }).click();
  const decision = page.getByRole("region", { name: `Review: ${work}` });
  await expect(decision.getByRole("region", { name: "사유" })).toContainText(
    "로그인 화면 수정 결과",
  );
  const blocks = decision.getByRole("region", { name: "막고 있는 작업" });
  await expect(blocks.getByRole("link", { name: "로그인 화면 다시 그리기" })).toBeVisible();
  await expect(blocks).toContainText("입력란 배치를 바꿉니다.");

  // 확인 요청에 응답해 닫으면 남은 질문으로 넘어가고 주소도 따라 바뀐다.
  await decision.getByRole("textbox", { name: "응답", exact: true }).click();
  await page.keyboard.type("진행합니다");
  await decision.getByRole("button", { name: "응답하고 닫기" }).click();
  await expectRowGoneWhenNotified(
    page,
    `${gate}에 응답하고 닫았습니다`,
    page.getByRole("button", { name: new RegExp(`Review: ${work}`) }),
  );

  await expect
    .poll(() => workspace.showIssue(gate).then((issue) => issue.close_reason), {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("Responded");
  await expect(page).toHaveURL(new RegExp(`item=${question}$`));
  await expect(page.getByRole("region", { name: "남은 질문" })).toBeVisible();
});

function screenTab(page: Page, name: string) {
  return page.getByRole("navigation", { name: "화면" }).getByRole("link", { name, exact: true });
}
