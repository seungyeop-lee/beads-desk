# Agents

## 프로젝트 개요

`bd`(Beads) CLI를 사용하는 로컬 웹 UI입니다. 서버가 `bd`를 `child_process.spawn`으로 실행하고, 그 출력을 화면에 보여 줍니다.

`bd`는 이 프로젝트가 수정할 수 없는 외부 의존성입니다. `bd`의 출력이나 명령 형식이 부족하면 서버 쪽 adapter에서 보완하거나 그 한계를 받아들입니다. upstream 변경을 전제로 설계하지 않습니다.

## 패키지 구성

| 경로             | 패키지                      | 역할                                                           |
| ---------------- | --------------------------- | -------------------------------------------------------------- |
| `packages/app`   | `@seungyeop-lee/beads-desk` | npm으로 배포하는 Next.js 앱과 `bd-desk` 실행 명령              |
| `packages/bd`    | `@beads-desk/bd`            | `bd` CLI 실행과 출력 해석. Next.js와 React에 의존하지 않습니다 |
| `packages/promo` | `@beads-desk/promo`         | README 스크린샷과 소개 영상을 만드는 도구. 배포하지 않습니다   |

`pnpm --filter promo run seed <디렉터리>`는 그 디렉터리에 git 저장소와 영어 데모 프로젝트(prefix `acme`)의 bd workspace를 만듭니다. 비어 있거나 전에 seed로 만든 디렉터리만 받고, 전에 만든 디렉터리는 비운 뒤 다시 만듭니다.

`pnpm --filter promo run capture`는 임시 디렉터리 아래 `acme-web`에 데모 workspace를 새로 만들고, 마지막 app build로 서버를 띄워 영어 UI와 라이트 테마로 화면을 캡처합니다. 먼저 `pnpm run build`를 실행하고, chromium이 없으면 `pnpm run test:e2e:install`로 설치합니다. 캡처할 화면과 순서는 `packages/promo/src/capture/captureTargets.ts`의 목록에서 정합니다.

- README 스크린샷은 `docs/screenshots/<이름>.png`에 저장하고 저장소에 commit합니다.
- 소개 영상용 녹화(`<이름>.webm`)는 `packages/promo/recordings/`에 저장합니다. 이 디렉터리는 저장소에 넣지 않습니다.
- 이미 만든 데모 workspace를 쓰려면 `--workspace <디렉터리>`를 줍니다. 화면 머리글에 디렉터리 이름이 보이므로 이름은 `acme-web`으로 둡니다. gate 응답과 카드 이동 녹화가 그 workspace의 이슈를 바꾸므로, 같은 workspace로 다시 캡처하기 전에 seed로 다시 만듭니다.

`pnpm --filter promo run video`는 capture가 남긴 녹화로 Remotion을 실행해 소개 영상을 만듭니다. 먼저 capture를 실행합니다. 처음 실행할 때 Remotion이 렌더링용 Chrome Headless Shell(약 170MB)을 `packages/promo/node_modules/.remotion`에 내려받습니다. 명령이 끝나면 파일마다 길이, 해상도, frame rate, 용량을 출력합니다.

- `packages/promo/out/beads-desk-intro.mp4`는 Needs human(hero), Now, 그래프, Decisions, 보드, 설치 안내를 이어 붙인 전체 영상입니다(H.264, 1600×900, 25fps).
- `packages/promo/out/beads-desk-intro.gif`는 README 맨 위에 두는, 같은 영상을 줄인 GIF입니다(960×540, 6.25fps). GitHub 이미지 첨부 한도인 10MB를 넘으면 명령이 실패합니다.
- `packages/promo/out/`은 저장소에 넣지 않습니다.
- 장면 순서, 자막, 녹화에서 잘라 쓰는 구간은 `packages/promo/src/video/introTimeline.ts`에 있습니다. 구간은 녹화 시각으로 적혀 있으므로, `captureTargets.ts`에서 장면의 동작이나 pause 길이를 바꾸면 구간도 함께 고칩니다.

`packages/bd` 같은 내부 패키지는 빌드 때 app의 server bundle에 포함되므로 app의 `devDependencies`에만 둡니다. `dependencies`에 넣으면 게시된 패키지를 설치할 때 찾을 수 없는 의존성이 됩니다.

저장소에서 개발할 때는 Node 24 이상을 씁니다. nvm을 쓰면 저장소 루트에서 `nvm use`로 `.nvmrc`의 버전을 고릅니다. `packages/app`의 `engines`(Node 22 이상)는 사용자가 배포 패키지를 설치할 때의 조건이므로 함께 올리지 않습니다.

## 실행 구조

`bd-desk start`(`packages/app/bin/bd-desk.js`, 명령을 생략해도 같음)는 패키지에 포함된 `.next` 빌드를 대상으로 `next start`를 background process group으로 실행합니다. 사용자가 명령을 실행한 디렉터리는 `BEADS_DESK_WORKSPACE` 환경 변수로 서버에 전달됩니다.

- workspace는 bd와 같은 기준으로 찾습니다. 지금 디렉터리부터 git 저장소 최상위까지 설정이나 DB 파일이 있는 `.beads`를 찾고, git worktree라 찾지 못했으면 main 저장소의 `.beads`를 확인해 worktree 최상위 디렉터리를 workspace로 씁니다. 이 규칙은 `packages/app/bin/workspaceRoot.js` 한 곳에 있고, launcher와 서버가 함께 import합니다. launcher는 서버 bundle을 불러올 수 없으므로, 둘이 같은 규칙을 써야 하는 코드는 `bin`에 plain JS로 두고 패키지 `files`에도 넣습니다. launcher 실행 파일과 상대 경로 import로 연결된 파일이 `package.json`의 `files`에 포함됐는지는 `packages/app/bin/packageFiles.test.ts`가 검사하며, 누락되면 `pnpm run check`가 실패합니다. 서버에서 import할 수 있는 `bin` 파일은 `architecture.test.ts`의 `LAUNCHER_MODULES`에 등록합니다.
- workspace를 찾지 못하면 서버를 띄우거나 바꾸지 않고 종료 코드 1로 끝납니다.
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

- 읽기는 client infra → `/api/...` Route Handler → `server/web/*RouteApi.ts` → `@beads-desk/bd` 순서로 연결합니다. bd 호출을 넘어서는 조립이 필요한 읽기는 그 사이에서 `server/modules/<기능>/application`이 조립합니다.
- 쓰기는 `server/web`의 Server Action(`*Action.ts`, `*Actions.ts`)으로 처리합니다. client는 server에서 이 파일만 import합니다. Server Action은 쓰기가 성공하면 `checkWorkspaceChangesNow`를 호출해, 다음 polling 주기를 기다리지 않고 변경을 알립니다. client는 쓰기 결과로 화면 데이터를 직접 고치지 않고 이 알림으로 다시 조회합니다.
- `src/proxy.ts`가 모든 요청에서 Host를 검사해, `localhost`·`127.0.0.1`·`[::1]`이 아니면 403으로 거부합니다. DNS rebinding으로 다른 사이트가 API와 Server Action을 호출하지 못하게 막는 검사이므로, Route API와 Server Action에서 Host를 다시 검사하지 않습니다. Server Action은 화면 경로로 POST되므로 proxy에 matcher를 두어 경로를 좁히지 않습니다.
- 변경 알림은 `/api/events` SSE 하나로 보냅니다. workspace DB가 바뀌면 데이터 없이 `invalidate` 이벤트만 보내고, client는 보고 있는 데이터를 다시 조회합니다. 서버는 SSE 연결이 있는 동안에만 DB 상태를 주기적으로 확인하므로, bd CLI로 바꾼 내용도 알림이 갑니다. 새로 구독하는 연결마다 기준값 알림을 한 번 보내고, 연결을 처음 여는 탭은 그 알림을 받은 뒤 첫 조회를 시작합니다.
- 브라우저에서는 탭 하나만 SSE를 열고 다른 탭에 알림을 전달합니다. 탭마다 연결을 열면 브라우저의 host별 연결 한도를 넘어 조회가 멈추므로, 서버 이벤트는 `client/infra/workspaceEvents`로만 구독하고 `EventSource`를 따로 열지 않습니다.
- `@beads-desk/bd`는 server에서만 import합니다. client와 shared는 bd를 실행하지 않는 이슈 model(`@beads-desk/bd/issue`)만 import합니다.
- 화면 문구는 `client/modules/locale/domain`의 `koMessages.ts`와 `enMessages.ts`에 모두 넣습니다. 두 사전은 같은 type이라 한쪽에만 넣으면 typecheck가 실패합니다. 영어 문구는 bd CLI 출력의 용어(`DEPENDS ON`, `BLOCKS`, `ready` 등)를 따릅니다.
  - 화면을 그리는 코드는 `useMessages()`로, 이벤트 처리처럼 browser에서만 실행되는 코드는 `documentMessages()`로 사전을 읽습니다.
  - Server Action과 Route API가 화면에 보내는 오류 문구는 `server/web/locale/serverMessages.ts`에 두 언어로 넣습니다.
- 디렉터리는 함께 바뀌는 기능 이름으로 묶습니다. `utils`, `helpers`, `common` 같은 역할 이름 디렉터리는 만들지 않습니다.

import 제한은 `eslint.config.js`가, layer 방향과 디렉터리 구조는 `packages/app/src/server/architecture.test.ts`가, 파일 단위 순환은 oxlint의 `import/no-cycle`이 검사합니다. 경계를 바꾸면 이 검사들도 함께 고칩니다.

## 작성 언어

파일과 출력마다 쓰는 언어는 아래와 같습니다. 어느 언어로 쓰든 식별자, 라이브러리 이름, 명령어는 원문을 유지합니다.

- 영어로 씁니다.
  - 외부 문서: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `.github/ISSUE_TEMPLATE/`의 issue template
  - `bd-desk` CLI와 배포 스크립트(`packages/app/bin/`, `packages/app/scripts/`)가 출력하는 문구. 터미널 언어를 감지하지 않고 영어로만 출력합니다.
- 한국어로 씁니다.
  - 코드 주석, 테스트 이름, 커밋 메시지, 모든 디렉터리의 `AGENTS.md`, `docs/`
  - `README.ko.md`. `README.md`의 한국어 미러이므로, `README.md`를 고치면 같은 내용으로 함께 고칩니다.
- 한국어와 영어로 함께 씁니다.
  - 웹 UI 문구. Server Action, Route API, `packages/bd`가 화면에 전달하는 오류도 포함합니다. 문구를 넣을 사전은 "소스 구조" 절에 있습니다.

커밋 메시지는 Conventional Commits 형식(`type(scope): 제목`)을 따릅니다.

코드 주석에는 bd 이슈 ID를 적지 않고, 지켜야 할 규칙이나 이유를 문장으로 적습니다. `.beads/`는 저장소에 들어가지 않아서, 저장소나 npm 패키지로 코드를 읽는 사람은 그 ID로 내용을 찾을 수 없습니다.

## 워크트리 작업

AI 에이전트는 이슈마다 저장소 밖에 git worktree를 만들어 작업할 수 있습니다. worktree는 새 checkout이므로, 만든 뒤 루트에서 `pnpm install`을 먼저 실행합니다(hook도 이때 설치됩니다).

- 편집 도구에 넘기는 파일 경로는 worktree 절대 경로로 씁니다. 상대 경로는 세션 작업 디렉터리(메인 트리) 기준으로 해석돼서 메인 트리에 편집이 생깁니다. 셸 명령마다 `git -C <worktree>`를 쓰는 것과 같은 이유로, 편집 도구의 경로에도 똑같이 적용됩니다.
- 워크트리 작업 중 메인 트리에 변경이 생겼으면 먼저 diff를 확인합니다. 변경이 워크트리에서 하려던 편집뿐이면 `git -C <메인 트리> restore -- <파일>`로 원복하고 그 편집을 worktree에 절대 경로로 다시 적용한 뒤, 검증을 처음부터 다시 실행합니다. 내 편집으로 설명되지 않는 변경이 섞여 있으면 직접 되돌리지 않고 보고합니다.

## 검증

`pnpm run check`가 typecheck, lint, format 검사, unit test, 컴포넌트 테스트를 차례로 실행합니다. lefthook이 pre-commit에서 staged 파일의 format과 lint를, pre-push에서 `pnpm run check`를 실행합니다. hook은 `pnpm install` 때 설치됩니다.

`packages/bd`의 unit test는 저장해 둔 bd 출력으로 해석을 확인하므로, 설치된 bd의 출력 형식이 바뀌어도 통과합니다. bd를 업데이트했거나 `packages/bd`의 출력 해석을 고쳤다면 `pnpm run test:bd`를 실행합니다. 이 명령은 임시 디렉터리에 bd workspace를 만들고 설치된 bd로 adapter를 실행합니다(`packages/bd/src/realBd`, 약 15초). bd가 설치되어 있어야 하며, `pnpm run check`와 hook에서는 실행되지 않습니다.

컴포넌트의 가로 넘침, 줄 수, 경계 좌표처럼 CSS 배치로 정해지는 결과는 컴포넌트 테스트로 검사합니다. 컴포넌트 옆에 `*.browser.test.tsx`로 두면 `pnpm run test:components`가 Vitest Browser Mode로 실제 chromium에서 실행합니다(`packages/app/vitest.browser.config.ts`, 약 1초이고 Vite 캐시가 없으면 약 3초). bd와 서버 없이 실행되지만 chromium이 설치되어 있어야 합니다(`pnpm run test:e2e:install`).

- 고정 데이터로 렌더링하고, class 이름이 아니라 실제 너비에서 잰 크기와 좌표를 검사합니다.
- 화면 단위로 렌더링할 때는 서버에서 읽는 hook(`useDecisions` 등)과 `IssueDetailRoute`를 `vi.mock`으로 바꿉니다. `next/navigation` hook을 쓰는 컴포넌트는 `next/navigation`도 `vi.mock`으로 바꿉니다. `next/link`는 그대로 렌더링됩니다.
- 컴포넌트 테스트 설정은 `"use server"` 파일을 호출하면 실패하는 함수로 바꿔 불러오므로, Server Action을 실행해야 하는 동작은 e2e로 확인합니다.
- 실패하면 `packages/app/.vitest/attachments/failure-screenshots`에 screenshot이 남습니다.

화면 동작은 `packages/app/e2e`의 Playwright 시나리오로 확인합니다. e2e는 hook과 `pnpm run check`에서 실행되지 않으므로, 화면이나 화면이 부르는 API를 바꾼 작업은 아래 순서로 확인합니다. 바뀐 동작을 다루는 시나리오가 없으면, unit test나 컴포넌트 테스트로 확인할 수 없는지 먼저 따져 본 뒤 시나리오를 추가합니다. 시나리오를 추가하는 기준과 작성 규칙, 시나리오를 바꾼 작업이 보고할 테스트 수와 실행 시간은 `packages/app/e2e/AGENTS.md`에 있습니다. 처음 한 번은 `pnpm run test:e2e:install`로 chromium을 설치합니다.

1. 작업하는 동안에는 `pnpm run build`로 빌드한 뒤, `packages/app`에서 `pnpm exec playwright test <spec 경로>`로 바꾼 동작을 다루는 spec만 실행합니다. 이 명령은 빌드하지 않고 마지막 build 결과를 띄우므로, app 코드를 고칠 때마다 다시 빌드합니다.
2. 화면을 바꿨으면 바뀐 화면을 스크린샷으로 직접 확인합니다. 화면 관련 작업의 스크린샷은 `/tmp` 폴더에 저장하고, 보고할 때 마크다운 링크로 제시합니다. 전체 실행을 마친 뒤에 화면 문제를 고치면 전체 실행을 다시 해야 합니다.
3. 끝내기 전에 `pnpm run test:e2e`로 전체 시나리오를 한 번 실행합니다.

- `pnpm run test:e2e`는 app을 production build로 빌드한 뒤 시나리오를 worker 8개(RAM disk를 쓰지 않으면 4개)로 나눠 실행합니다. worker마다 3900번부터 빈 포트를 찾아 `next start`를 띄우고, 실행이 끝나면 서버를 종료합니다. 다른 프로세스가 쓰는 포트는 건너뛰므로 `next dev`가 떠 있어도 됩니다.
- 다른 worktree의 e2e가 실행 중이면 `다른 e2e 실행(pid <번호>)이 끝나기를 기다립니다.`를 출력하고, 그 실행이 끝난 뒤 시작합니다. `pnpm run test:e2e`는 기다리는 동안 빌드도 하지 않고, 차례를 받은 뒤에 빌드합니다. 실행 하나가 CPU를 거의 다 써서, 겹쳐 돌리면 둘 다 느려지고 조회가 timeout을 넘겨 실패합니다. 먼저 시작한 실행이 비정상으로 끝나 차례를 돌려주지 못했으면, 다음 실행은 기다리지 않고 시작합니다.
- Playwright가 마지막에 표시하는 시간에는 빌드 없이 실행했을 때 차례를 기다린 시간이 들어갑니다. 기다렸으면 `차례를 <초> 기다렸습니다.`가 따로 출력되고, `pnpm run test:e2e`는 끝에 `e2e 대기 <초>, 빌드 <초>, 시나리오 실행 <초>`를 출력합니다.
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

`.github/workflows/`를 바꿨다면 push하기 전에 [act](https://github.com/nektos/act)로 바꾼 job을 실행해 봅니다. Docker runtime이 실행 중이어야 하고 act가 설치되어 있어야 합니다(macOS는 `brew install act`). runner 이미지는 `-P`로 `catthehacker/ubuntu:act-latest`를 지정합니다. 저장소 루트에서 아래 명령을 실행해, act가 `Job succeeded`를 출력하고 종료 코드 0으로 끝나면 통과입니다. 이미지를 받은 뒤에는 `pnpm-check`가 약 1분 30초, `package-smoke`가 약 1분 걸립니다.

```sh
act pull_request -j pnpm-check -P ubuntu-latest=catthehacker/ubuntu:act-latest --rm
act pull_request -j package-smoke -P ubuntu-latest=catthehacker/ubuntu:act-latest --rm
```

- `-j`는 event와 관계없이 모든 workflow에서 그 ID의 job을 찾아 실행합니다. 그래서 `release.yml`에서 `check.yml`을 호출하는 job은 `pnpm-check`나 `package-smoke`와 겹치지 않는 `pre-publish-check`라는 ID를 씁니다.
- workflow의 job ID나 파일 이름을 바꾸면 이 문서의 act 명령도 함께 고칩니다. `pnpm run check`의 unit test(`packages/app/scripts/actCommands.test.ts`)가 act 명령의 `-j` job ID가 workflow 중 정확히 한 곳에 있는지, `-W` 경로에 파일이 있는지, 두 workflow에 같은 job ID가 없는지 검사합니다.
- act는 commit하지 않은 변경까지 포함해 작업 트리를 container에 복사합니다. `.gitignore`에 있는 파일(`node_modules` 등)은 복사하지 않습니다.
- `--rm`을 빼면 job이 실패했을 때 이름이 `act-`로 시작하는 container와 volume이 남습니다.
- Apple Silicon에서 act가 `--container-architecture linux/amd64`를 쓰라는 경고를 출력해도 이 옵션은 주지 않습니다. Docker Desktop의 containerd image store에서는 act가 amd64 이미지의 `PATH`를 읽지 못해, node로 실행하는 action이 `exec: "node": executable file not found in $PATH`로 실패합니다.

act의 결과가 GitHub-hosted runner(x64 `ubuntu-latest`)의 결과와 같지는 않으므로, 최종 확인은 PR의 GitHub Actions 실행 결과로 합니다.

- runner 이미지가 달라 미리 설치된 패키지와 apt 저장소가 다릅니다. `playwright install --with-deps`처럼 apt로 설치하는 단계는 act에서 통과해도 GitHub에서 실패할 수 있고, 반대의 경우도 생깁니다.
- Apple Silicon에서는 arm64 container에서 실행하므로, pnpm이 GitHub runner와 다른 플랫폼의 native 패키지를 설치합니다.
- cache는 act에 내장된 cache server가 `~/.cache/actcache`에 저장합니다. 두 번째 실행부터 setup-node의 pnpm cache가 복원되지만, GitHub의 cache와는 공유되지 않습니다.
- act에서는 OIDC token을 발급받을 수 없으므로, `id-token: write` 권한이 필요한 단계는 act로 확인할 수 없습니다.

## 릴리스

`main`에 push하면 `.github/workflows/release.yml`이 `packages/app/package.json`의 `version`을 npm에서 찾습니다. 이미 있으면 아무것도 하지 않고 끝납니다. 아직 없는 version이면 같은 커밋에서 `check.yml`의 job(`pnpm-check`, `package-smoke`)을 모두 실행하고, 모두 성공한 뒤에 빌드해서 `packages/app/scripts/run-npm-release.mjs publish`로 게시하고 `v<version>` tag와 GitHub Release를 만듭니다. 그래서 version을 올린 커밋이 곧 릴리스가 됩니다.

1. 저장소 루트 `CHANGELOG.md`의 가장 최근 version 절 위에 `## [<version>] - <YYYY-MM-DD>` 절을 추가하고, 바뀐 내용을 영어로 적습니다. 이 절의 본문(다음 `## ` 제목 앞까지)이 GitHub Release의 노트가 됩니다.
2. `packages/app/package.json`의 `version`을 같은 값으로 바꿉니다.
3. 두 변경을 `main`에 push합니다.

- 검사가 하나라도 실패하면 게시하지 않고 workflow가 실패로 끝납니다. 고친 커밋을 push하면 version이 아직 npm에 없으므로 그 커밋에서 다시 검사하고 게시합니다. main push마다 `check.yml`도 따로 실행되므로, version을 올린 커밋에서는 같은 검사가 두 번 실행됩니다.
- 해당 절이 없거나 본문이 비어 있거나 제목이 날짜로 끝나지 않으면, workflow는 게시하기 전에 실패합니다(수동 실행은 날짜가 없으면 경고만 출력합니다). 날짜를 아직 정하지 않은 절은 `## [<version>] - Unreleased`로 적어 두고 version을 올릴 때 날짜로 바꿉니다. version이 `0.0.0`이 아니면 `pnpm run check`의 unit test(`packages/app/scripts/releaseNotes.test.ts`)도 같은 조건을 검사합니다.
- npm 인증은 trusted publishing(OIDC)으로 합니다. npmjs.com의 trusted publisher 설정에 workflow 파일 이름 `release.yml`을 적으므로, 파일 이름을 바꾸면 그 설정도 함께 바꿉니다. 첫 게시처럼 trusted publisher를 설정하기 전에는 저장소 secret `NPM_TOKEN`을 두면 OIDC 인증이 실패한 뒤 그 token으로 게시합니다. trusted publisher를 설정한 뒤 secret을 지우면 OIDC만 씁니다.
- 게시한 뒤 tag나 Release 생성이 실패하면, workflow를 다시 실행해도 version이 이미 있어서 건너뜁니다. 이때는 `node packages/app/scripts/releaseNotes.mjs <version> > <노트 파일>`로 노트를 뽑아 `gh release create v<version> --target <커밋> --title v<version> --notes-file <노트 파일>`로 직접 만듭니다. prerelease version이면 `--prerelease`도 붙입니다.

prerelease도 같은 순서로 냅니다. version 뒤에 `-`로 prerelease 부분을 붙이고(예: `0.2.0-beta.1`), CHANGELOG 절 제목에도 그 version을 그대로 적습니다(`## [0.2.0-beta.1] - <YYYY-MM-DD>`). workflow는 version에 prerelease 부분이 있으면 npm에 `next` dist-tag로 게시하고 GitHub Release를 prerelease로 만듭니다. `latest`는 바뀌지 않으므로, version이나 `@next`를 지정하지 않고 설치하는 사용자는 계속 마지막 정식 version을 받습니다.

`release.yml`을 고쳤으면 수동 실행(`workflow_dispatch`)으로 확인합니다. 수동 실행은 `npm publish --dry-run`까지만 실행하고 tag와 Release를 만들지 않습니다. 입력 `package`와 `version`은 npm에서 찾을 대상과 `CHANGELOG.md`에서 읽을 version을 바꾸므로, 이미 있는 version(예: `package=react`, `version=19.0.0`)과 없는 version을 넣어 두 분기를 확인합니다. act로 실행할 때는 `검증`의 act 설명을 따르되, event는 반드시 `workflow_dispatch`로 줍니다. `push` event로 실행하면 dry-run이 아니라 실제 게시를 시도합니다.

```sh
act workflow_dispatch -W .github/workflows/release.yml --input version=<CHANGELOG.md에 있는 version> -P ubuntu-latest=catthehacker/ubuntu:act-latest --rm
act workflow_dispatch -W .github/workflows/release.yml --input package=react --input version=19.0.0 -P ubuntu-latest=catthehacker/ubuntu:act-latest --rm
```

없는 version은 `pre-publish-check/check/pnpm-check`와 `pre-publish-check/check/package-smoke` job이 `Job succeeded`로 끝난 뒤, `publish` job이 `npm notice ... (dry-run)`을 출력하고 `Job succeeded`로 끝나면 통과입니다(약 2분 10초). 이미 있는 version은 `published on npm: true`를 출력한 뒤 `pre-publish-check`와 `publish` job이 실행되지 않고 끝나면 통과입니다. act는 OIDC token을 발급하지 못하므로, trusted publishing 인증은 trusted publisher를 설정한 뒤 GitHub에서 게시할 때에만 확인할 수 있습니다.

prerelease 분기는 `version`에 npm에 없는 prerelease version(예: `0.2.0-beta.1`)을 넣어 확인합니다. CHANGELOG.md에 그 절이 없으면 노트를 읽는 단계에서 실패하므로, 확인하는 동안만 `## [<prerelease version>] - Unreleased` 절을 커밋하지 않고 추가해 둡니다. dry-run은 입력과 관계없이 `packages/app`의 version을 게시하지만 tag는 입력 version으로 정합니다. 그래서 `publish` job의 npm 로그가 prerelease 입력에서는 `with tag next`를, 정식 version 입력에서는 `with tag latest`를 출력하면 통과입니다.
