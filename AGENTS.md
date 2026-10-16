# Agents

## 프로젝트 개요

`bd`(Beads) CLI를 사용하는 로컬 웹 UI입니다. 서버가 `bd`를 `child_process.spawn`으로 실행하고, 그 출력을 화면에 보여 줍니다.

`bd`는 이 프로젝트가 수정할 수 없는 외부 의존성입니다. `bd`의 출력이나 명령 형식이 부족하면 서버 쪽 adapter에서 보완하거나 그 한계를 받아들입니다. upstream 변경을 전제로 설계하지 않습니다.

## 패키지 구성

| 경로           | 패키지                      | 역할                                                           |
| -------------- | --------------------------- | -------------------------------------------------------------- |
| `packages/app` | `@seungyeop-lee/beads-desk` | npm으로 배포하는 Next.js 앱과 `bd-desk` 실행 명령              |
| `packages/bd`  | `@beads-desk/bd`            | `bd` CLI 실행과 출력 해석. Next.js와 React에 의존하지 않습니다 |

`packages/bd` 같은 내부 패키지는 빌드 때 app의 server bundle에 포함되므로 app의 `devDependencies`에만 둡니다. `dependencies`에 넣으면 게시된 패키지를 설치할 때 찾을 수 없는 의존성이 됩니다.

## 실행 구조

`bd-desk start`(`packages/app/bin/bd-desk.js`, 명령을 생략해도 같음)는 패키지에 포함된 `.next` 빌드를 대상으로 `next start`를 background process group으로 실행합니다. 사용자가 명령을 실행한 디렉터리는 `BEADS_DESK_WORKSPACE` 환경 변수로 서버에 전달됩니다.

- 지금 디렉터리와 그 상위에 `.beads`가 없으면 서버를 띄우거나 바꾸지 않고 종료 코드 1로 끝납니다.
- 서버가 이미 실행 중이면 새로 띄우지 않고, `POST /api/workspaces`로 지금 디렉터리를 등록해 현재 workspace로 바꿉니다.
- `stop`은 서버가 응답하지 않아도 process group 전체를 종료합니다. 상태 파일의 pid가 서버의 process group 리더가 아니면(pid가 재사용된 경우) 종료하지 않고 상태 파일만 지웁니다.
- `stop`과 `restart`는 `$XDG_RUNTIME_DIR/beads-desk`(없으면 OS 임시 디렉터리 아래 `beads-desk`)의 `server.json`에서 pid와 포트를 읽습니다. 서버 로그는 같은 디렉터리의 `server.log`에 쌓입니다.

서버 전체에서 하나만 있어야 하는 상태는 `globalThis`에 둡니다. instrumentation과 route handler는 같은 module을 서로 다른 사본으로 불러오기 때문에 module 변수로는 상태를 공유할 수 없습니다.

- app의 전역 상태는 `packages/app/src/server/infra/` 아래에 구현합니다. 서버가 시작될 때 준비해야 하는 상태(bd 버전)는 `src/instrumentation.ts`에서 시작하고, DB 변경 감시는 첫 SSE 구독이 들어올 때 시작합니다.
- 등록한 workspace 목록과 현재 workspace는 서버 전체에서 하나입니다. 한 탭에서 바꾸면 다른 탭과 창도 함께 바뀌고, bd 실행과 DB 변경 감시는 모두 현재 workspace를 대상으로 합니다.
- bd 실행 큐는 `@beads-desk/bd`가 첫 호출 때 직접 만듭니다. app에서 bd 실행을 따로 직렬화하지 않습니다.

## 소스 구조

Next.js 16은 학습 데이터와 다른 API와 규칙이 많습니다. Next.js 코드를 쓰기 전에 `packages/app/node_modules/next/dist/docs/`에서 해당 문서를 확인합니다.

`packages/app/src`는 실행 위치에 따라 `app`, `client`, `server`, `shared`로 나누고, 각각을 다시 layer로 나눕니다.

| 경로                                         | 두는 것                                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `app/(client)`                               | 화면 route의 `page.tsx`와 `layout.tsx`. 화면 자체는 `client/ui/screens`에 두고 조립만 합니다 |
| `app/(server)`                               | Route Handler. `server/web`의 `*RouteApi.ts`만 호출합니다                                    |
| `client/ui`                                  | 화면, component, 스타일                                                                      |
| `client/modules/<기능>/application`          | 기능 상태와 조회·갱신 순서. React hook을 포함합니다                                          |
| `client/modules/<기능>/domain`               | 정렬·필터처럼 외부 통로 없이 성립하는 규칙                                                   |
| `client/infra`                               | HTTP, SSE 같은 browser 통로                                                                  |
| `server/web`                                 | Route API와 Server Action. 입력 검사와 응답 변환을 여기서 끝냅니다                           |
| `server/modules/<기능>/{application,domain}` | bd 호출을 넘어서는 업무 규칙이 생길 때 만듭니다                                              |
| `server/infra`                               | 서버 전역 상태와 외부 기술 연결                                                              |
| `shared/contract`                            | client와 server가 주고받는 API 경로와 요청·응답 형태                                         |
| `shared/domain`                              | client와 server가 함께 쓰는 업무 규칙                                                        |

- 읽기는 client infra → `/api/...` Route Handler → `server/web/*RouteApi.ts` → `@beads-desk/bd` 순서로 연결합니다.
- 쓰기는 `server/web`의 Server Action(`*Action.ts`, `*Actions.ts`)으로 처리합니다. client는 server에서 이 파일만 import합니다. Server Action은 쓰기가 성공하면 `checkWorkspaceChangesNow`를 호출해, 다음 polling 주기를 기다리지 않고 변경을 알립니다. client는 쓰기 결과로 화면 데이터를 직접 고치지 않고 이 알림으로 다시 조회합니다.
- 변경 알림은 `/api/events` SSE 하나로 보냅니다. workspace DB가 바뀌면 데이터 없이 `invalidate` 이벤트만 보내고, client는 보고 있는 데이터를 다시 조회합니다. 서버는 SSE 연결이 있는 동안에만 DB 상태를 2초마다 확인하므로, bd CLI로 바꾼 내용도 알림이 갑니다.
- 브라우저에서는 탭 하나만 SSE를 열고 다른 탭에 알림을 전달합니다. 탭마다 연결을 열면 브라우저의 host별 연결 한도를 넘어 조회가 멈추므로, 서버 이벤트는 `client/infra/workspaceEvents`로만 구독하고 `EventSource`를 따로 열지 않습니다.
- `@beads-desk/bd`는 server에서만 import합니다. client와 shared는 bd를 실행하지 않는 이슈 model(`@beads-desk/bd/issue`)만 import합니다.
- 화면 문구는 `client/modules/locale/domain`의 `koMessages.ts`와 `enMessages.ts`에 모두 넣습니다. 두 사전은 같은 type이라 한쪽에만 넣으면 typecheck가 실패합니다. 영어 문구는 bd CLI 출력의 용어(`DEPENDS ON`, `BLOCKS`, `ready` 등)를 따릅니다.
  - 화면을 그리는 코드는 `useMessages()`로, 이벤트 처리처럼 browser에서만 실행되는 코드는 `documentMessages()`로 사전을 읽습니다.
  - Server Action과 Route API가 화면에 보내는 오류 문구는 `server/web/locale/serverMessages.ts`에 두 언어로 넣습니다.
- 디렉터리는 함께 바뀌는 기능 이름으로 묶습니다. `utils`, `helpers`, `common` 같은 역할 이름 디렉터리는 만들지 않습니다.

import 제한은 `eslint.config.js`가, layer 방향과 디렉터리 구조는 `packages/app/src/server/architecture.test.ts`가, 파일 단위 순환은 oxlint의 `import/no-cycle`이 검사합니다. 경계를 바꾸면 이 검사들도 함께 고칩니다.

## 작성 언어

문서, 코드 주석, 커밋 메시지는 한국어로 씁니다. 식별자, 라이브러리 이름, 명령어는 원문을 유지합니다. 커밋 메시지는 Conventional Commits 형식(`type(scope): 제목`)을 따릅니다.

코드 주석에는 bd 이슈 ID를 적지 않고, 지켜야 할 규칙이나 이유를 문장으로 적습니다. `.beads/`는 저장소에 들어가지 않아서, 저장소나 npm 패키지로 코드를 읽는 사람은 그 ID로 내용을 찾을 수 없습니다.

## 검증

`pnpm run check`가 typecheck, lint, format 검사, unit test를 차례로 실행합니다. lefthook이 pre-commit에서 staged 파일의 format과 lint를, pre-push에서 `pnpm run check`를 실행합니다. hook은 `pnpm install` 때 설치됩니다.

`packages/bd`의 unit test는 저장해 둔 bd 출력으로 해석을 확인하므로, 설치된 bd의 출력 형식이 바뀌어도 통과합니다. bd를 업데이트했거나 `packages/bd`의 출력 해석을 고쳤다면 `pnpm run test:bd`를 실행합니다. 이 명령은 임시 디렉터리에 bd workspace를 만들고 설치된 bd로 adapter를 실행합니다(`packages/bd/src/realBd`, 약 15초). bd가 설치되어 있어야 하며, `pnpm run check`와 hook에서는 실행되지 않습니다.

화면 동작은 `packages/app/e2e`의 Playwright 시나리오로 확인합니다. e2e는 hook과 `pnpm run check`에서 실행되지 않으므로, 화면이나 화면이 부르는 API를 바꾼 작업은 아래 순서로 확인합니다. 바뀐 동작을 다루는 시나리오가 없으면 함께 추가합니다. 시나리오 작성 규칙은 `packages/app/e2e/AGENTS.md`에 있습니다. 처음 한 번은 `pnpm run test:e2e:install`로 chromium을 설치합니다.

1. 작업하는 동안에는 `pnpm run build`로 빌드한 뒤, `packages/app`에서 `pnpm exec playwright test <spec 경로>`로 바꾼 동작을 다루는 spec만 실행합니다. 이 명령은 빌드하지 않고 마지막 build 결과를 띄우므로, app 코드를 고칠 때마다 다시 빌드합니다.
2. 화면을 바꿨으면 바뀐 화면을 스크린샷 등으로 직접 확인합니다. 전체 실행을 마친 뒤에 화면 문제를 고치면 전체 실행을 다시 해야 합니다.
3. 끝내기 전에 `pnpm run test:e2e`로 전체 시나리오를 한 번 실행합니다.

- `pnpm run test:e2e`는 app을 production build로 빌드한 뒤 시나리오를 worker 8개(RAM disk를 쓰지 않으면 4개)로 나눠 실행합니다. worker마다 3900번부터 빈 포트를 찾아 `next start`를 띄우고, 실행이 끝나면 서버를 종료합니다. 다른 프로세스가 쓰는 포트는 건너뛰므로 `next dev`가 떠 있어도 됩니다.
- 다른 worktree의 e2e가 실행 중이면 `다른 e2e 실행(pid <번호>)이 끝나기를 기다립니다.`를 출력하고, 그 실행이 끝난 뒤 시작합니다. 실행 하나가 CPU를 거의 다 써서, 겹쳐 돌리면 둘 다 느려지고 조회가 timeout을 넘겨 실패합니다. 먼저 시작한 실행이 비정상으로 끝나 차례를 돌려주지 못했으면, 다음 실행은 기다리지 않고 시작합니다.
- macOS에서는 실행하는 동안 `/Volumes/beads-desk-e2e-<실행 pid>`에 512MB RAM disk를 붙이고, 시나리오 workspace를 그 아래에 만듭니다. 실행이 끝나면 성공·실패와 관계없이 떼어 냅니다. 실행이 비정상으로 끝나 volume이 남아 있으면 다음 실행이 뗍니다. RAM disk 없이 실행하려면 `BEADS_DESK_E2E_RAMDISK=0`을 줍니다. 디스크에서는 worker들의 bd 실행이 디스크 I/O를 함께 쓰느라 느려지므로 worker를 4개로 줄여 실행합니다.
- 시나리오가 실패하면 `packages/app/test-results`에 screenshot과 trace가 남습니다. trace는 `pnpm exec playwright show-trace <trace.zip 경로>`로 엽니다.

`next dev`가 실행 중일 때 `packages/bd`를 고치면, 서버를 다시 시작하기 전까지 API가 고치기 전의 코드로 bd를 실행합니다. bd 패키지를 고친 뒤 화면이나 API로 확인하려면 `next dev`를 다시 시작합니다.

`next dev`에서 페이지가 끝없이 다시 로드되면(HMR 메시지 `reloadPage: HMR hash mismatch`가 반복됨) 개발 서버를 끄고 `packages/app/.next/dev`를 지운 뒤 다시 시작합니다. 원인은 확인하지 못했습니다. 지우기 전에 개발 서버에 연결된 브라우저 탭, `/_next/hmr` WebSocket에서 반복되는 메시지, `.next/dev` 복사본을 남깁니다. 확인 방법과 지금까지의 조사 기록은 `docs/troubleshooting.md`에 있습니다.

배포 패키지 구성(`files`, 의존성, launcher)을 바꿨다면 저장소 밖에서 설치해 실행해 봅니다.

1. `packages/app`에서 `pnpm run pack:local`을 실행해 현재 디렉터리에 tarball을 만듭니다.
2. `npm install -g --prefix <임시 디렉터리> <tarball 경로>`로 설치합니다.
3. bd workspace 디렉터리에서 `XDG_RUNTIME_DIR=<다른 임시 디렉터리> <임시 디렉터리>/bin/bd-desk start`를 실행합니다. `XDG_RUNTIME_DIR`을 따로 주어야 평소에 쓰는 서버의 상태 파일을 건드리지 않습니다.
4. 출력된 URL의 `/api/health` 응답에서 `runtime.workspaceRoot`가 3번의 디렉터리이고 `runtime.bdVersion`이 비어 있지 않으면 정상입니다.
5. 같은 `XDG_RUNTIME_DIR`로 `<임시 디렉터리>/bin/bd-desk stop`을 실행해 서버를 종료합니다.
