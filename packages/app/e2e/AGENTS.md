# e2e 시나리오 작성 규칙과 실행 방식

작업 중과 끝내기 전에 시나리오를 실행하는 순서는 저장소 루트 `AGENTS.md`의 "검증" 절에 있습니다.

## 데이터 준비

- 시나리오는 `test`와 `expect`를 `@playwright/test`가 아니라 `support/bdWorkspace.ts`에서 import합니다. 이 `test`는 시나리오마다 빈 bd workspace를 임시 디렉터리에 만들어 서버에 등록하고, 시나리오가 끝나면 지웁니다. 두 번째 workspace가 필요한 시나리오는 `otherWorkspace` fixture를 씁니다. `bd init`은 한 번에 수 초씩 걸리므로 worker마다 한 번만 초기화한 원본(`workspaceTemplate`)을 복사해 만듭니다. 시나리오에서 `bd init`을 다시 실행하지 않습니다.
- 필요한 이슈와 의존 관계는 `workspace` fixture로 심습니다. bd 한 번이 수 초씩 걸릴 때가 있어, 시나리오를 시작할 때 심는 데이터는 bd 실행 횟수를 줄여 만듭니다.
  - 이슈를 둘 이상 심거나 상태·상위 이슈·의존 관계까지 정해 심을 때는 `workspace.createIssues({ key: { title, type, ... } }, [[기다리는 key, 먼저 끝나야 하는 key]])`를 씁니다. `bd create --graph` 한 번으로 만들고 key마다 id를 돌려줍니다. related나 discovered-from 관계는 쌍의 세 번째 값으로 관계를 적어(`[발견한 이슈 key, 발견한 작업 key, "discovered-from"]`) 같은 호출에서 심고, `bd dep add`를 따로 실행하지 않습니다.
  - 이슈 하나만 필요하면 `workspace.createIssue(제목, ...bd create 인자)`를 씁니다.
  - 댓글처럼 `createIssues`로 표현할 수 없는 준비와, 서버 알림을 확인하려고 시나리오 도중에 CLI로 바꾸는 동작은 `workspace.bd(...인자)`로 실행합니다.
- 이 저장소나 다른 실제 workspace의 `.beads`를 쓰지 않습니다. 시나리오에서 `POST /api/workspaces`로 workspace를 직접 등록하지 않습니다.
- worker마다 서버를 따로 띄우고(`support/appServer.ts`) 한 worker 안의 시나리오는 순서대로 실행합니다. 서버에는 시나리오마다 등록한 workspace가 쌓이므로, workspace 이름이 없는 예전 주소(`/issues`)는 workspace를 고르는 화면으로 갑니다.
- baseURL은 시나리오 workspace의 화면 주소(`/w/<workspace 이름>/`)입니다. `page.goto`, `toHaveURL`, `page.request`에는 `issues?view=ready`처럼 `/` 없이 쓴 상대 경로를 넘겨 그 workspace의 화면으로 보냅니다. `/`로 시작하면 서버 루트 기준이 되어 workspace 이름이 빠집니다. 그래프 복귀 주소처럼 `/`로 시작하는 화면 경로를 그대로 열 때는 `` `.${경로}` ``로 넘깁니다.
- 화면이 보내는 API 요청에는 `workspace` query가 붙습니다. `page.route`로 가로챌 때는 `**/api/epics?*`처럼 query까지 맞는 pattern을 씁니다.
- worker들이 bd를 동시에 실행하면 디스크 I/O를 함께 쓰느라 시나리오가 혼자 돌 때보다 느려집니다. 그래서 macOS에서는 시나리오 workspace를 RAM disk에 만들고(`support/ramDisk.ts`), `playwright.config.ts`의 test timeout은 60초, expect timeout은 10초로 둡니다. 시나리오와 지원 코드에서 임시 디렉터리는 `os.tmpdir()`로 얻습니다. `/tmp` 같은 경로를 직접 쓰면 RAM disk 밖에 만들어집니다.

## 시나리오 범위

검사를 추가할 때는 unit test(`*.test.ts`), 컴포넌트 테스트(`*.browser.test.tsx`), e2e 시나리오 순서로 검토하고, 앞의 두 테스트로 확인할 수 없을 때만 시나리오를 추가합니다.

- 사용자 흐름을 다룹니다: 화면 이동과 주소, dialog, 편집 결과 반영, 서버 알림(SSE)으로 다시 조회한 결과.
- 가로 넘침, 줄 수, 요소 위치처럼 배치를 검사하는 시나리오는 만들지 않습니다. 배치는 컴포넌트 테스트(`*.browser.test.tsx`)로 확인합니다.
- 선택지 계산, 정렬, 필터 같은 규칙은 `src`의 unit test(`*.test.ts`)로 확인합니다.
- 좁은 창에서만 생기는 흐름은 대표 너비 하나에서 확인합니다. 너비, 확대율, 언어 같은 조건을 곱해 같은 흐름을 반복하지 않습니다. 조건마다 흐름이 달라 곱해야 한다면 그 이유를 spec에 주석으로 적습니다.
- 기존 test가 심은 데이터로 확인할 수 있는 변형은 새 test로 만들지 않고 그 test에 단계로 더합니다. 진입 방법(주소로 바로 열기, 페이지를 누르지 않고 키보드만 쓰기), 닫는 방법, 입력 방법만 다른 변형이 여기에 해당합니다. 앞 단계가 바꾼 화면에서 다시 시작해야 하면 `page.goto`로 다시 들어와 이어 갑니다.
- 같은 작업에서 컴포넌트 테스트를 더했으면, 그 테스트가 확인한 동작을 e2e에서 다시 확인하지 않습니다. 컴포넌트 테스트가 실제 화면 대신 dialog나 form으로 감싸 확인했어도 같습니다. 컴포넌트 테스트는 bd와 서버 없이 실행되고 Server Action을 실행하지 않으므로(`packages/app/src/client/ui/AGENTS.md`), e2e에는 bd에 저장하거나 bd에서 읽어 온 데이터, 서버 알림, 주소와 화면 이동을 확인하는 단계만 남깁니다.
- 결과를 확인하지 않는 `page.screenshot`을 spec에 남기지 않습니다. 화면을 눈으로 보려고 spec에 넣은 `page.screenshot`은 본 뒤에 지웁니다. 실패한 시나리오의 screenshot은 `playwright.config.ts`의 설정이 남깁니다.
- 같은 종류의 검사를 하는 spec이 있으면 새 파일을 만들지 않고 그 spec에 시나리오를 더합니다.
- 앱 코드를 바꾸지 않은 작업에서는 새 spec을 만들지 않습니다.

## 테스트 수 상한

`pnpm run check`는 `pnpm exec playwright test --list`의 전체 테스트 수가 `testLimit.json`의 `limit`을 넘으면 실패합니다. 위 "시나리오 범위"의 기준을 따져도 새 test가 필요할 때만 `limit`을 올립니다.

- `limit`을 올린 수만큼 `reasons`에 `"<spec 경로>: <unit·컴포넌트 테스트로 확인할 수 없는 흐름>"` 항목을 하나씩 더합니다. `limit`에서 `baseline`을 뺀 수와 `reasons`의 항목 수가 다르면 검사가 실패합니다.
- e2e를 정리할 때는 `reasons`에 적힌 이유가 아직 맞는지부터 확인합니다. 정리로 테스트 수를 줄였으면 `baseline`과 `limit`을 정리한 뒤의 테스트 수로 맞추고 `reasons`를 비웁니다.

## 작성 방법

- spec은 `e2e/<화면이나 기능>/<동작>.spec.ts`에 둡니다. 여러 spec이 함께 쓰는 지원 코드는 `e2e/support`에 둡니다.
- 요소는 `getByRole`과 접근 가능한 이름으로 찾습니다. 찾을 이름이 없으면 화면에 `aria-label`을 붙이는 것을 먼저 검토합니다.
- bd CLI로 바꾼 내용이나 서버 알림을 기다릴 때 `page.waitForTimeout`을 쓰지 않고, 조건이 맞을 때까지 다시 확인하는 `expect(locator).toBeVisible()` 같은 assertion을 씁니다.
- 화면에서 고친 값이 bd에 저장됐는지는 `expect.poll(() => workspace.showIssue(id)..., { timeout: SAVE_TIMEOUT })`로 확인합니다. 서버의 bd 실행 한 번이 몇 초씩 걸릴 때가 있어 기본 timeout 5초 안에 저장되지 않을 수 있습니다.
- spec은 단독으로 실행해도 통과해야 합니다. 앞 spec이 남긴 상태에 기대지 않습니다.
- timeout을 직접 적을 때, 화면 반영이나 저장을 기다리는 값에는 `support/stress.ts`의 `TIMEOUT_SCALE`을 곱해 stress 모드에서 함께 늘어나게 합니다. 두 변화가 동시에 일어나는지처럼 순서를 확인하는 값(`support/humanGates.ts`의 `SIMULTANEOUS_MS`)에는 곱하지 않습니다.

## 실행 비용 보고

시나리오를 추가하거나 고치거나 지운 작업은 결과를 보고할 때 아래 값을 함께 적습니다.

- 추가하거나 지운 테스트 수와 작업 후 전체 테스트 수. 전체 테스트 수는 `packages/app`에서 `pnpm exec playwright test --list`를 실행하면 마지막 줄 `Total: <개수> tests in <파일 수> files`에 나옵니다. 이 명령은 시나리오를 실행하지 않습니다.
- 바꾼 spec을 단독으로 실행했을 때 테스트마다 걸린 시간과 그 합. `pnpm run build`로 빌드한 뒤 `packages/app`에서 `pnpm exec playwright test <spec 경로>`를 실행하면, 테스트 이름 뒤 괄호에 그 테스트의 시간이 표시됩니다. 마지막 줄 `<개수> passed (<초>)`에는 서버를 띄우는 시간이 들어가고 테스트를 여러 worker에 나눠 실행한 결과라서, spec의 비용으로 쓰지 않습니다.
- 그 spec에서 가장 오래 걸린 테스트가 시나리오 도중 bd에 쓰는 횟수. 화면에서 저장하는 동작과 `workspace.bd` 실행을 셉니다.
- `testLimit.json`의 `limit`을 올렸으면 올린 수와 `reasons`에 적은 이유.

## `pnpm run test:e2e` 실행 방식

- app을 production build로 빌드한 뒤 시나리오를 worker 8개(RAM disk를 쓰지 않으면 4개)로 나눠 실행합니다. worker마다 3900번부터 빈 포트를 찾아 `next start`를 띄우고, 실행이 끝나면 서버를 종료합니다. 다른 프로세스가 쓰는 포트는 건너뛰므로 `next dev`가 떠 있어도 됩니다.
- 다른 worktree의 e2e가 실행 중이면 `다른 e2e 실행(pid <번호>)이 끝나기를 기다립니다.`를 출력하고, 그 실행이 끝난 뒤 시작합니다. 기다리는 동안 빌드도 하지 않고, 차례를 받은 뒤에 빌드합니다. 먼저 시작한 실행이 비정상으로 끝나 차례를 돌려주지 못했으면, 다음 실행은 기다리지 않고 시작합니다.
- Playwright가 마지막에 표시하는 시간에는 빌드 없이 실행했을 때 차례를 기다린 시간이 들어갑니다. 기다렸으면 `차례를 <초> 기다렸습니다.`가 따로 출력되고, `pnpm run test:e2e`는 끝에 `e2e 대기 <초>, 빌드 <초>, 시나리오 실행 <초>`를 출력합니다.
- macOS에서는 실행하는 동안 `/Volumes/beads-desk-e2e-<실행 pid>`에 512MB RAM disk를 붙이고, 시나리오 workspace를 그 아래에 만듭니다. 실행이 끝나면 성공·실패와 관계없이 떼어 냅니다. 실행이 비정상으로 끝나 volume이 남아 있으면 다음 실행이 뗍니다. `BEADS_DESK_E2E_RAMDISK=0`을 주면 RAM disk 없이 디스크에서 실행합니다. 디스크에서는 worker들의 bd 실행이 디스크 I/O를 함께 쓰느라 느려지므로, `playwright.config.ts`가 RAM disk를 쓰지 않을 때 worker를 자동으로 4개로 줄입니다. worker 수를 따로 지정할 필요는 없습니다.
- 시나리오가 실패하면 `packages/app/test-results`에 screenshot과 trace가 남습니다. trace는 `pnpm exec playwright show-trace <trace.zip 경로>`로 엽니다.

## stress 모드로 간헐적 실패 찾기

반복 실행만으로는 드러나지 않는 간헐적 실패는 bd를 늦추거나 브라우저 CPU를 제한해 찾습니다. 새 시나리오를 추가하거나 고친 뒤에도 같은 조건으로 실행해 볼 수 있습니다. 아래 환경 변수를 하나라도 주면 stress 모드가 켜지고, 주지 않으면 평소와 같이 실행됩니다.

| 환경 변수                     | 값                                                           | 적용 대상                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `BEADS_DESK_E2E_BD_DELAY_MS`  | `<최소>-<최대>` 밀리초(예: `500-1500`). 범위 폭은 32767 이하 | 서버, fixture, git hook이 실행하는 bd가 이 범위에서 임의로 기다린 뒤 실행됩니다                                                         |
| `BEADS_DESK_E2E_CPU_THROTTLE` | 1보다 큰 배수(예: `4`, `8`)                                  | 시나리오의 `page` fixture가 이 배수만큼 느린 CPU로 실행됩니다. `context.newPage()`로 열거나 링크로 새로 열린 page에는 적용되지 않습니다 |

`packages/app`에서 아래처럼 실행합니다. spec 하나만 볼 때는 `pnpm run build` 뒤 `pnpm exec playwright test <spec 경로>`에 같은 환경 변수를 줍니다.

```sh
BEADS_DESK_E2E_BD_DELAY_MS=500-1500 BEADS_DESK_E2E_CPU_THROTTLE=8 pnpm run test:e2e
```

- stress 모드에서는 test timeout, expect timeout, `SAVE_TIMEOUT`이 모두 4배(`TIMEOUT_SCALE`)로 늘어납니다. 늦은 조회만으로는 실패하지 않으므로, 이 모드에서 나온 실패는 시나리오나 앱이 순서나 상태를 가정한 곳부터 찾습니다.
- 실행을 시작할 때 `e2e stress 모드: bd 지연 500–1500ms, CPU 8배 제한, timeout 4배`처럼 켠 조건이 출력됩니다. 이 줄이 없으면 환경 변수가 Playwright까지 전달되지 않은 것입니다.
- 실행이 끝나면 `e2e stress 모드 적용 결과: bd 지연 wrapper를 거친 bd 실행 서버 <횟수>번, fixture <횟수>번, git hook <횟수>번, CPU 8배 제한을 적용한 page <개수>개`가 출력됩니다. 이 줄로 조건이 실제로 적용됐는지 확인합니다.
  - 서버나 fixture 횟수가 0이면 그쪽 bd가 wrapper를 거치지 않은 것입니다.
  - git hook은 git 커밋을 만드는 spec(`hygiene/hygiene-page.spec.ts`, `issues/local-markdown-files.spec.ts`)을 실행했을 때만 0보다 큽니다.
  - page 개수는 실행한 테스트 가운데 `page`를 쓰는 테스트 수와 같습니다.
