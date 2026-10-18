# 컴포넌트 테스트

컴포넌트의 가로 넘침, 줄 수, 경계 좌표처럼 CSS 배치로 정해지는 결과는 컴포넌트 테스트로 검사합니다. 컴포넌트 옆에 `*.browser.test.tsx`로 두면 `pnpm run test:components`가 Vitest Browser Mode로 실제 chromium에서 실행합니다(`packages/app/vitest.browser.config.ts`, 약 1초이고 Vite 캐시가 없으면 약 3초). bd와 서버 없이 실행되지만 chromium이 설치되어 있어야 합니다(`pnpm run test:e2e:install`).

- 고정 데이터로 렌더링하고, class 이름이 아니라 실제 너비에서 잰 크기와 좌표를 검사합니다.
- 화면 단위로 렌더링할 때는 서버에서 읽는 hook(`useDecisions` 등)과 `IssueDetailRoute`를 `vi.mock`으로 바꿉니다. `next/navigation` hook을 쓰는 컴포넌트는 `next/navigation`도 `vi.mock`으로 바꿉니다. `next/link`는 그대로 렌더링됩니다.
- 컴포넌트 테스트 설정은 `"use server"` 파일을 호출하면 실패하는 함수로 바꿔 불러오므로, Server Action을 실행해야 하는 동작은 e2e로 확인합니다.
- 실패하면 `packages/app/.vitest/attachments/failure-screenshots`에 screenshot이 남습니다.
