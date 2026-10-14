# e2e 시나리오 작성 규칙

실행 방법은 저장소 루트 `AGENTS.md`의 "검증" 절에 있습니다.

## 데이터 준비

- 시나리오는 `test`와 `expect`를 `@playwright/test`가 아니라 `support/bdWorkspace.ts`에서 import합니다. 이 `test`는 시나리오마다 빈 bd workspace를 임시 디렉터리에 만들고 서버의 현재 workspace로 바꾼 뒤, 시나리오가 끝나면 지웁니다. `bd init`은 한 번에 수 초씩 걸리므로 worker마다 한 번만 초기화한 원본(`workspaceTemplate`)을 복사해 만듭니다. 시나리오에서 `bd init`을 다시 실행하지 않습니다.
- 필요한 이슈와 의존 관계는 `workspace` fixture로 심습니다. `workspace.createIssue(제목, ...bd create 인자)`는 만든 이슈의 id를 돌려주고, 그 밖의 bd 명령은 `workspace.bd(...인자)`로 실행합니다.
- 이 저장소나 다른 실제 workspace의 `.beads`를 쓰지 않습니다. 시나리오에서 `POST /api/workspaces`로 workspace를 직접 바꾸지 않습니다.
- 서버의 현재 workspace는 서버 전체에서 하나라서 시나리오를 한 worker에서 순서대로 실행합니다. `workers`를 늘리거나 `fullyParallel`을 켜지 않습니다.

## 시나리오 범위

- 브라우저에서만 확인할 수 있는 동작을 다룹니다: 화면 이동과 주소, dialog, 배치, 편집 결과 반영, 서버 알림(SSE)으로 다시 조회한 결과.
- 선택지 계산, 정렬, 필터 같은 규칙은 `src`의 unit test(`*.test.ts`)로 확인합니다.

## 작성 방법

- spec은 `e2e/<화면이나 기능>/<동작>.spec.ts`에 둡니다. 여러 spec이 함께 쓰는 지원 코드는 `e2e/support`에 둡니다.
- 요소는 `getByRole`과 접근 가능한 이름으로 찾습니다. 찾을 이름이 없으면 화면에 `aria-label`을 붙이는 것을 먼저 검토합니다.
- bd CLI로 바꾼 내용이나 서버 알림을 기다릴 때 `page.waitForTimeout`을 쓰지 않고, 조건이 맞을 때까지 다시 확인하는 `expect(locator).toBeVisible()` 같은 assertion을 씁니다.
- 화면에서 고친 값이 bd에 저장됐는지는 `expect.poll(() => workspace.showIssue(id)..., { timeout: SAVE_TIMEOUT })`로 확인합니다. 서버의 bd 실행 한 번이 몇 초씩 걸릴 때가 있어 기본 timeout 5초 안에 저장되지 않을 수 있습니다.
- spec은 단독으로 실행해도 통과해야 합니다. 앞 spec이 남긴 상태에 기대지 않습니다.
