# e2e 시나리오 작성 규칙

실행 방법은 저장소 루트 `AGENTS.md`의 "검증" 절에 있습니다.

## 데이터 준비

- 시나리오는 `test`와 `expect`를 `@playwright/test`가 아니라 `support/bdWorkspace.ts`에서 import합니다. 이 `test`는 시나리오마다 빈 bd workspace를 임시 디렉터리에 만들고 서버의 현재 workspace로 바꾼 뒤, 시나리오가 끝나면 지웁니다. `bd init`은 한 번에 수 초씩 걸리므로 worker마다 한 번만 초기화한 원본(`workspaceTemplate`)을 복사해 만듭니다. 시나리오에서 `bd init`을 다시 실행하지 않습니다.
- 필요한 이슈와 의존 관계는 `workspace` fixture로 심습니다. bd 한 번이 수 초씩 걸릴 때가 있어, 시나리오를 시작할 때 심는 데이터는 bd 실행 횟수를 줄여 만듭니다.
  - 이슈를 둘 이상 심거나 상태·상위 이슈·의존 관계까지 정해 심을 때는 `workspace.createIssues({ key: { title, type, ... } }, [[기다리는 key, 먼저 끝나야 하는 key]])`를 씁니다. `bd create --graph` 한 번으로 만들고 key마다 id를 돌려줍니다.
  - 이슈 하나만 필요하면 `workspace.createIssue(제목, ...bd create 인자)`를 씁니다.
  - 댓글처럼 `createIssues`로 표현할 수 없는 준비와, 서버 알림을 확인하려고 시나리오 도중에 CLI로 바꾸는 동작은 `workspace.bd(...인자)`로 실행합니다.
- 이 저장소나 다른 실제 workspace의 `.beads`를 쓰지 않습니다. 시나리오에서 `POST /api/workspaces`로 workspace를 직접 바꾸지 않습니다.
- 서버의 현재 workspace는 서버 전체에서 하나라서, worker마다 서버를 따로 띄우고(`support/appServer.ts`) 한 worker 안의 시나리오는 순서대로 실행합니다. 시나리오에서 `page.goto`와 `request`는 상대 경로로 써서 자기 worker의 서버로 보냅니다.
- worker들이 bd를 동시에 실행하면 디스크 I/O를 함께 쓰느라 시나리오가 혼자 돌 때보다 느려집니다. 그래서 macOS에서는 시나리오 workspace를 RAM disk에 만들고(`support/ramDisk.ts`), `playwright.config.ts`의 test timeout은 60초, expect timeout은 10초로 둡니다. 시나리오와 지원 코드에서 임시 디렉터리는 `os.tmpdir()`로 얻습니다. `/tmp` 같은 경로를 직접 쓰면 RAM disk 밖에 만들어집니다.

## 시나리오 범위

- 브라우저에서만 확인할 수 있는 동작을 다룹니다: 화면 이동과 주소, dialog, 배치, 편집 결과 반영, 서버 알림(SSE)으로 다시 조회한 결과.
- 선택지 계산, 정렬, 필터 같은 규칙은 `src`의 unit test(`*.test.ts`)로 확인합니다.

## 작성 방법

- spec은 `e2e/<화면이나 기능>/<동작>.spec.ts`에 둡니다. 여러 spec이 함께 쓰는 지원 코드는 `e2e/support`에 둡니다.
- 요소는 `getByRole`과 접근 가능한 이름으로 찾습니다. 찾을 이름이 없으면 화면에 `aria-label`을 붙이는 것을 먼저 검토합니다.
- bd CLI로 바꾼 내용이나 서버 알림을 기다릴 때 `page.waitForTimeout`을 쓰지 않고, 조건이 맞을 때까지 다시 확인하는 `expect(locator).toBeVisible()` 같은 assertion을 씁니다.
- 화면에서 고친 값이 bd에 저장됐는지는 `expect.poll(() => workspace.showIssue(id)..., { timeout: SAVE_TIMEOUT })`로 확인합니다. 서버의 bd 실행 한 번이 몇 초씩 걸릴 때가 있어 기본 timeout 5초 안에 저장되지 않을 수 있습니다.
- spec은 단독으로 실행해도 통과해야 합니다. 앞 spec이 남긴 상태에 기대지 않습니다.
