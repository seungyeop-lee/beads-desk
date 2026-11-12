import { beforeEach, vi } from "vitest";
import { commands } from "vitest/browser";
// 앱과 같은 Tailwind·daisyUI 스타일을 적용해야 실제 화면과 같은 배치로 검사할 수 있습니다.
// 프로덕션 빌드는 라이브러리 CSS 청크를 앱 CSS보다 먼저 연결하므로, 라이브러리 CSS를 불러 오는 화면(예: 그래프의
// @xyflow/react)은 라이브러리 CSS를 앱 CSS보다 먼저 주입해야 같은 명시도 규칙의 계산값이 프로덕션과 같아집니다.
// 브라우저 테스트의 CSS는 모듈 실행 순서대로 head 끝에 붙으므로, 라이브러리 CSS를 앱 CSS보다 먼저 적어 순서를 맞춥니다.
import "@xyflow/react/dist/style.css";
import "./src/client/ui/designSystem/styles/index.css";

// vitest.browser.config.ts의 browser.commands에 둔 명령입니다.
declare module "vitest/browser" {
  interface BrowserCommands {
    movePointerOffPage: () => Promise<void>;
  }
}

// 커서는 앞선 테스트나 앞선 테스트 파일이 마지막으로 옮긴 자리에 남습니다. 새로 그린 요소가 멈춘 커서 아래에 놓이면
// chromium이 그 요소에 pointerenter와 :hover를 주므로, 테스트마다 커서를 화면 밖으로 빼서 어떤 요소 위에도 없는 상태로 시작합니다.
// userEvent.unhover는 body 가운데로 커서를 옮길 뿐이라 이 용도로 쓸 수 없습니다.
beforeEach(async () => {
  await commands.movePointerOffPage();
});

// AppLayoutFixture가 그리는 AppHeader는 서버에서 판단 기다림 개수와 workspace 목록을 읽고 변경 알림을 구독합니다.
// 컴포넌트 테스트에는 서버가 없으므로 모든 테스트 파일에서 이 hook들을 고정 값으로 바꿉니다.
// 테스트 파일에서 같은 module을 vi.mock하면 그 테스트 파일에서는 테스트 파일의 값을 씁니다.
vi.mock("@/client/modules/humanDecisions/application/useHumanDecisionCount", () => ({
  useHumanDecisionCount: () => ({ data: 0, error: null, loading: false }),
}));
// playground처럼 workspace를 하나만 등록한 앱과 같이, 머리글이 workspace 선택 메뉴 대신 이름만 보입니다.
vi.mock("@/client/modules/workspace/application/useWorkspaces", () => ({
  useWorkspaces: () => ({
    data: { workspaces: [{ root: "/workspaces/demo", slug: "demo" }] },
    error: null,
    loading: false,
  }),
}));
vi.mock(
  "@/client/modules/humanDecisions/application/humanDecisionNotices",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useHumanDecisionNotices: () => {},
  }),
);
