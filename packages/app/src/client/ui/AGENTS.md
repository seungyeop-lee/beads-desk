# client/ui 층 위계, override 규칙, 컴포넌트 테스트

## 층 위계

client/ui는 아래 표 순서의 층으로 나누고, import는 아래 방향만 허용합니다. 아래 방향이면 층을 건너뛰어도 됩니다(예: screens → designSystem). 위로 가는 의존, 같은 층의 옆 의존, 화면끼리의 import는 금지이며, `packages/app/src/server/architecture.test.ts`가 생산 코드 파일만 검사합니다. 테스트 코드(`*.test.ts(x)`, `*.testkit.*`)는 여러 층을 아우르며 import하므로 검사에서 제외됩니다.

| 층               | 역할                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `screens/<화면>` | 화면 조립. 화면마다 한 층이라 화면끼리 import할 수 없고, 같은 화면 안의 import만 같은 층으로 허용합니다.                                     |
| `shell`          | 앱 바깥 틀: 머리글, workspace 선택, 화면 탭 색                                                                                               |
| `settings`       | 설정 dialog와 알림 설정                                                                                                                      |
| `theme`          | 테마 전환                                                                                                                                    |
| `issues`         | 이슈를 보여 주는 공용 component: 이슈 칩, 이슈 목록 줄, 상세 dialog, 이슈 시간 표시                                                          |
| `markdown`       | markdown 편집기와 미리보기                                                                                                                   |
| `designSystem`   | 모든 화면이 같은 모양으로 쓰는 기본 부품(빈 상태, 오류 안내, toast, dialog, 아이콘)과 화면 여럿이 쓰는 작은 유틸(`useMinuteClock` 같은 hook) |
| `address`        | 화면 주소: query 읽기·만들기, workspace 주소 변환, 그래프·이슈 목록 주소, 상세 dialog query 이름                                             |
| `locale`         | 화면 문구 사전 제공                                                                                                                          |

새 component나 주소 함수는 이 표의 역할에 맞는 층에 둡니다. 주소 함수와 주소 query 이름은 화면 하나에서만 쓰면 그 화면 안에, 여러 화면이나 다른 층이 쓰면 `address`에 둡니다. 이슈를 보여 주는 부품은 `issues`, 그 밖의 기본 부품은 `designSystem`에 둡니다.

## 공통화와 override

- 같은 모양이 여러 곳에 필요하면, 모양만 같으면 `designSystem/styles/components.css`의 class로 두고, markup이나 동작까지 같으면 component로 둡니다. 한 화면에서만 쓰면 화면 안에 둡니다.
- 공통 부품과 다른 부분은 아래 세 방법으로만 바꿉니다.
  1. **variant prop**: 크기, 계열, 강조처럼 설계된 변형입니다. 부품이 속한 층의 component에 variant를 더합니다.
  2. **className**: 놓이는 자리(여백, 너비, 배치)만 정할 때 쓰습니다. 부품에 넘기거나 감싸는 className에는 자리에 관한 class만 둡니다.
  3. **CSS 변수**: 값 하나만 다를 때 쓰입니다. 부품이 그 변수를 읽게 하고, 값을 바꾸는 쪽에서 정합니다.
- 색, 글자, 안쪽 간격 같은 모양 속성을 className으로 덮어쓰지 않습니다. 모양이 달라야 하면 그 부품이 속한 층에서 variant prop이나 CSS 변수를 늘립니다. tailwind-merge는 들이지 않습니다.

## 컴포넌트 테스트

컴포넌트의 가로 넘침, 줄 수, 경계 좌표처럼 CSS 배치로 정해지는 결과는 컴포넌트 테스트로 검사합니다. 컴포넌트 옆에 `*.browser.test.tsx`로 두면 `pnpm run test:components`가 Vitest Browser Mode로 실제 chromium에서 실행합니다(`packages/app/vitest.browser.config.ts`, 약 1초이고 Vite 캐시가 없으면 약 3초). bd와 서버 없이 실행되지만 chromium이 설치되어 있어야 합니다(`pnpm run test:e2e:install`).

- 고정 데이터로 렌더링하고, class 이름이 아니라 실제 너비에서 잰 크기와 좌표를 검사합니다.
- 화면 단위로 렌더링할 때는 서버에서 읽는 hook(`useDecisions` 등)과 `IssueDetailRoute`를 `vi.mock`으로 바꿉니다. `next/navigation` hook을 쓰는 컴포넌트는 `next/navigation`도 `vi.mock`으로 바꿉니다. `next/link`는 그대로 렌더링됩니다.
  - 두 module의 factory는 테스트 파일에 새로 쓰지 않고 `address/screenAddressMocks.testkit.ts`의 `nextNavigationMock`과 `issueDetailRouteMock`으로 만듭니다. 사용법은 그 파일의 주석에 있습니다.
- 앱이 그린 요소는 role과 접근 가능한 이름으로 찾습니다. 찾을 이름이 없으면 class나 DOM 구조로 찾기 전에 접근 가능한 이름을 붙일 수 있는지 먼저 검토합니다.
- 외부 라이브러리가 그리거나 정한 요소는 라이브러리별 selector 파일(`daisyDom.testkit.ts`, `markdown/codeMirrorDom.testkit.ts`, `markdown/milkdownDom.testkit.ts`, `designSystem/peleDom.testkit.ts`, `screens/graph/reactFlowDom.testkit.ts`)에 적은 selector로 찾습니다. 필요한 selector가 없으면 그 라이브러리의 selector 파일을 만들거나 더합니다.
- 상단 머리글 아래에서 화면을 검사할 때는 `shell/AppLayoutFixture.testkit.tsx`의 `AppLayoutFixture`로 실제 `AppHeader`와 함께 그립니다. 머리글이 서버에서 읽는 hook(`useHumanDecisionCount`, `useWorkspaces`, `useHumanDecisionNotices`)은 `packages/app/vitest.browser.setup.ts`가 모든 테스트 파일에서 고정 값으로 바꿔 둡니다. 다른 값이 필요한 테스트 파일은 같은 module을 직접 `vi.mock`합니다.
- 컴포넌트 테스트 설정은 `"use server"` 파일을 호출하면 실패하는 함수로 바꿔 불러오므로, Server Action을 실행해야 하는 동작은 e2e로 확인합니다.
- 실패하면 `packages/app/.vitest/attachments/failure-screenshots`에 screenshot이 남습니다.
