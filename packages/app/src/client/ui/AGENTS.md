# 컴포넌트 테스트

컴포넌트의 가로 넘침, 줄 수, 경계 좌표처럼 CSS 배치로 정해지는 결과는 컴포넌트 테스트로 검사합니다. 컴포넌트 옆에 `*.browser.test.tsx`로 두면 `pnpm run test:components`가 Vitest Browser Mode로 실제 chromium에서 실행합니다(`packages/app/vitest.browser.config.ts`, 약 1초이고 Vite 캐시가 없으면 약 3초). bd와 서버 없이 실행되지만 chromium이 설치되어 있어야 합니다(`pnpm run test:e2e:install`).

- 고정 데이터로 렌더링하고, class 이름이 아니라 실제 너비에서 잰 크기와 좌표를 검사합니다.
- 화면 단위로 렌더링할 때는 서버에서 읽는 hook(`useDecisions` 등)과 `IssueDetailRoute`를 `vi.mock`으로 바꿉니다. `next/navigation` hook을 쓰는 컴포넌트는 `next/navigation`도 `vi.mock`으로 바꿉니다. `next/link`는 그대로 렌더링됩니다.
  - 두 module의 factory는 테스트 파일에 새로 쓰지 않고 `address/screenAddressMocks.testkit.ts`의 `nextNavigationMock`과 `issueDetailRouteMock`으로 만듭니다. 사용법은 그 파일의 주석에 있습니다.
- 앱이 그린 요소는 role과 접근 가능한 이름으로 찾습니다. 찾을 이름이 없으면 class나 DOM 구조로 찾기 전에 접근 가능한 이름을 붙일 수 있는지 먼저 검토합니다.
- 외부 라이브러리가 그리거나 정한 요소는 라이브러리별 selector 파일(`daisyDom.testkit.ts`, `markdown/codeMirrorDom.testkit.ts`, `markdown/milkdownDom.testkit.ts`, `designSystem/peleDom.testkit.ts`, `screens/graph/reactFlowDom.testkit.ts`)에 적은 selector로 찾습니다. 필요한 selector가 없으면 그 라이브러리의 selector 파일을 만들거나 더합니다.
- 상단 머리글 아래에서 화면을 검사할 때는 `shell/AppLayoutFixture.testkit.tsx`의 `AppLayoutFixture`로 실제 `AppHeader`와 함께 그립니다. 머리글이 서버에서 읽는 hook(`useHumanDecisionCount`, `useWorkspaces`, `useHumanDecisionNotices`)은 `packages/app/vitest.browser.setup.ts`가 모든 테스트 파일에서 고정 값으로 바꿔 둡니다. 다른 값이 필요한 테스트 파일은 같은 module을 직접 `vi.mock`합니다.
- 컴포넌트 테스트 설정은 `"use server"` 파일을 호출하면 실패하는 함수로 바꿔 불러오므로, Server Action을 실행해야 하는 동작은 e2e로 확인합니다.
- 실패하면 `packages/app/.vitest/attachments/failure-screenshots`에 screenshot이 남습니다.
