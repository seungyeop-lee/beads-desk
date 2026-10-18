# Agents

## 프로젝트 개요

`bd`(Beads) CLI를 사용하는 로컬 웹 UI입니다. 서버가 `bd`를 `child_process.spawn`으로 실행하고, 그 출력을 화면에 보여 줍니다.

`bd`는 이 프로젝트가 수정할 수 없는 외부 의존성입니다. `bd`의 출력이나 명령 형식이 부족하면 서버 쪽 adapter에서 보완하거나 그 한계를 받아들입니다. upstream 변경을 전제로 설계하지 않습니다.

## 패키지 구성

- `packages/app`(`@seungyeop-lee/beads-desk`): npm으로 배포하는 Next.js 앱과 `bd-desk` 실행 명령
- `packages/bd`(`@beads-desk/bd`): `bd` CLI 실행과 출력 해석. Next.js와 React에 의존하지 않습니다
- `packages/promo`(`@beads-desk/promo`): README 스크린샷과 소개 영상을 만드는 도구. 배포하지 않습니다
- `packages/playground`(`@beads-desk/playground`): 테스트 데이터를 담은 workspace로 `next dev`를 띄우는 수동 테스트 환경. 배포하지 않습니다

아래 작업을 시작하기 전에 해당 문서를 읽습니다.

- README 스크린샷이나 소개 영상을 만들거나 `packages/promo`를 고칠 때: `packages/promo/AGENTS.md`
- 화면을 직접 조작해 보거나 데이터가 있어야 드러나는 버그를 재현할 때(`pnpm playground`로 테스트 데이터 workspace와 개발 서버를 띄웁니다): `packages/playground/AGENTS.md`
- `packages/bd`를 고치거나 bd를 업데이트했을 때: `packages/bd/AGENTS.md`
- launcher(`packages/app/bin`)나 배포 패키지 구성(`files`, 의존성)을 바꿀 때: `packages/app/bin/AGENTS.md`
- 컴포넌트 테스트(`*.browser.test.tsx`)를 쓰거나 고칠 때: `packages/app/src/client/ui/AGENTS.md`
- e2e 시나리오를 추가하거나 고칠 때, `pnpm run test:e2e`의 실행 방식을 알아볼 때: `packages/app/e2e/AGENTS.md`
- `.github/workflows/`를 고칠 때: `.github/AGENTS.md`
- 릴리스가 게시되지 않았거나 prerelease를 낼 때: `docs/release.md`

하위 디렉터리에 `AGENTS.md`를 새로 만들면 이 목록에 그 문서를 읽을 작업을 적습니다. 저장소에는 `CLAUDE.md`나 `CLAUDE.local.md`를 만들지 않습니다. 작업 디렉터리나 그 위 디렉터리에 이 파일이 하나라도 있으면 Claude Code가 `AGENTS.md`를 읽지 않습니다.

`packages/bd` 같은 내부 패키지는 빌드 때 app의 server bundle에 포함되므로 app의 `devDependencies`에만 둡니다. `dependencies`에 넣으면 게시된 패키지를 설치할 때 찾을 수 없는 의존성이 됩니다.

저장소에서 개발할 때는 Node 24 이상을 씁니다. nvm을 쓰면 저장소 루트에서 `nvm use`로 `.nvmrc`의 버전을 고릅니다. `packages/app`의 `engines`(Node 22 이상)는 사용자가 배포 패키지를 설치할 때의 조건이므로 함께 올리지 않습니다.

## 실행 구조

`bd-desk start`는 패키지에 포함된 `.next` 빌드로 `next start`를 background에서 실행하고, 명령을 실행한 디렉터리에서 찾은 bd workspace를 서버에 전달합니다. 서버가 이미 실행 중이면 새로 띄우지 않고 그 workspace를 현재 workspace로 바꿉니다.

서버 전체에서 하나만 있어야 하는 상태는 `globalThis`에 둡니다. instrumentation과 route handler는 같은 module을 서로 다른 사본으로 불러오기 때문에 module 변수로는 상태를 공유할 수 없습니다.

- app의 전역 상태는 `packages/app/src/server/infra/` 아래에 구현합니다. 서버가 시작될 때 준비해야 하는 상태(bd 버전)는 `src/instrumentation.ts`에서 시작하고, DB 변경 감시는 첫 SSE 구독이 들어올 때 시작합니다.
- 등록한 workspace 목록과 현재 workspace는 서버 전체에서 하나입니다. 한 탭에서 바꾸면 다른 탭과 창도 함께 바뀌고, bd 실행과 DB 변경 감시는 모두 현재 workspace를 대상으로 합니다.
- bd 실행 큐는 `@beads-desk/bd`가 첫 호출 때 직접 만듭니다. app에서 bd 실행을 따로 직렬화하지 않습니다.

## 소스 구조

Next.js 16은 학습 데이터와 다른 API와 규칙이 많습니다. Next.js 코드를 쓰기 전에 `packages/app/node_modules/next/dist/docs/`에서 해당 문서를 확인합니다.

`packages/app/src`는 실행 위치에 따라 `app`, `client`, `server`, `shared`로 나누고, 각각을 다시 layer로 나눕니다. 경로마다 두는 것은 아래와 같습니다.

- `app/(client)`: 화면 route의 `page.tsx`와 `layout.tsx`. 화면 자체는 `client/ui/screens`에 두고 조립만 합니다
- `app/(server)`: Route Handler. `server/web`의 `*RouteApi.ts`만 호출합니다
- `client/ui`: 화면, component, 스타일
- `client/modules/<기능>/application`: 기능 상태와 조회·갱신 순서. React hook을 포함합니다
- `client/modules/<기능>/domain`: 정렬·필터처럼 외부 통로 없이 성립하는 규칙
- `client/infra`: HTTP, SSE 같은 browser 통로
- `server/web`: Route API와 Server Action. 입력 검사와 응답 변환을 여기서 끝냅니다
- `server/modules/<기능>/{application,domain}`: bd 호출을 넘어서는 업무 규칙이 생길 때 만듭니다
- `server/infra`: 서버 전역 상태와 외부 기술 연결
- `shared/contract`: client와 server가 주고받는 API 경로와 요청·응답 형태
- `shared/domain`: client와 server가 함께 쓰는 업무 규칙

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
  - 외부 문서: `README.md`, `USAGE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `.github/ISSUE_TEMPLATE/`의 issue template
  - `bd-desk` CLI와 배포 스크립트(`packages/app/bin/`, `packages/app/scripts/`)가 출력하는 문구. 터미널 언어를 감지하지 않고 영어로만 출력합니다.
- 한국어로 씁니다.
  - 코드 주석, 테스트 이름, 커밋 메시지, 모든 디렉터리의 `AGENTS.md`, `docs/`, `.claude/skills/`의 프로젝트 skill
  - `README.ko.md`와 `USAGE.ko.md`. 각각 `README.md`와 `USAGE.md`의 한국어 미러이므로, 영어 문서를 고치면 같은 내용으로 함께 고칩니다.
- 한국어와 영어로 함께 씁니다.
  - 웹 UI 문구. Server Action, Route API, `packages/bd`가 화면에 전달하는 오류도 포함합니다. 문구를 넣을 사전은 "소스 구조" 절에 있습니다.

커밋 메시지는 Conventional Commits 형식(`type(scope): 제목`)을 따릅니다.

코드 주석에는 bd 이슈 ID를 적지 않고, 지켜야 할 규칙이나 이유를 문장으로 적습니다. `.beads/`는 저장소에 들어가지 않아서, 저장소나 npm 패키지로 코드를 읽는 사람은 그 ID로 내용을 찾을 수 없습니다.

## 프로젝트 skill

프로젝트 skill은 `.claude/skills/<이름>/SKILL.md`에 둡니다. 저장소 루트의 `.agents/skills`는 `../.claude/skills`를 가리키는 심볼릭 링크라서, Claude Code와 Codex가 같은 skill을 읽습니다. 사용자가 직접 불러야 하는 skill은 frontmatter에 `disable-model-invocation: true`를 두고, Codex용으로 skill 폴더의 `agents/openai.yaml`에 `policy.allow_implicit_invocation: false`를 둡니다.

## 워크트리 작업

AI 에이전트는 이슈마다 저장소 밖에 git worktree를 만들어 작업할 수 있습니다. worktree는 새 checkout이므로, 만든 뒤 루트에서 `pnpm install`을 먼저 실행합니다(hook도 이때 설치됩니다).

- 편집 도구에 넘기는 파일 경로는 worktree 절대 경로로 씁니다. 상대 경로는 세션 작업 디렉터리(메인 트리) 기준으로 해석돼서 메인 트리에 편집이 생깁니다. 셸 명령마다 `git -C <worktree>`를 쓰는 것과 같은 이유로, 편집 도구의 경로에도 똑같이 적용됩니다.
- 워크트리 작업 중 메인 트리에 변경이 생겼으면 먼저 diff를 확인합니다. 변경이 워크트리에서 하려던 편집뿐이면 `git -C <메인 트리> restore -- <파일>`로 원복하고 그 편집을 worktree에 절대 경로로 다시 적용한 뒤, 검증을 처음부터 다시 실행합니다. 내 편집으로 설명되지 않는 변경이 섞여 있으면 직접 되돌리지 않고 보고합니다.

## 검증

`pnpm run check`가 typecheck, lint, format 검사, unit test, 컴포넌트 테스트를 차례로 실행합니다. lefthook이 pre-commit에서 staged 파일의 format과 lint를, pre-push에서 `pnpm run check`를 실행합니다. hook은 `pnpm install` 때 설치됩니다.

아래 확인은 `pnpm run check`와 hook에서 실행되지 않으므로, 조건에 해당하면 따로 실행합니다. 절차는 각 문서에 있습니다.

- bd를 업데이트했거나 `packages/bd`의 출력 해석을 고쳤으면 `pnpm run test:bd`를 실행합니다(`packages/bd/AGENTS.md`).
- 배포 패키지 구성(`files`, 의존성, launcher)을 바꿨으면 저장소 밖에서 설치해 실행해 봅니다(`packages/app/bin/AGENTS.md`).
- `.github/workflows/`를 바꿨으면 push하기 전에 act로 바꾼 job을 실행해 봅니다(`.github/AGENTS.md`).

컴포넌트의 가로 넘침, 줄 수, 경계 좌표처럼 CSS 배치로 정해지는 결과는 컴포넌트 테스트(`*.browser.test.tsx`)로 검사합니다.

화면 동작은 `packages/app/e2e`의 Playwright 시나리오로 확인합니다. e2e도 hook과 `pnpm run check`에서 실행되지 않으므로, 화면이나 화면이 부르는 API를 바꾼 작업은 아래 순서로 확인합니다. 바뀐 동작을 다루는 시나리오가 없으면, unit test나 컴포넌트 테스트로 확인할 수 없는지 먼저 따져 본 뒤 시나리오를 추가합니다. 처음 한 번은 `pnpm run test:e2e:install`로 chromium을 설치합니다.

1. 작업하는 동안에는 `pnpm run build`로 빌드한 뒤, `packages/app`에서 `pnpm exec playwright test <spec 경로>`로 바꾼 동작을 다루는 spec만 실행합니다. 이 명령은 빌드하지 않고 마지막 build 결과를 띄우므로, app 코드를 고칠 때마다 다시 빌드합니다.
2. 화면을 바꿨으면 바뀐 화면을 스크린샷으로 직접 확인합니다. 화면 관련 작업의 스크린샷은 `/tmp` 폴더에 저장하고, 보고할 때 마크다운 링크로 제시합니다. 전체 실행을 마친 뒤에 화면 문제를 고치면 전체 실행을 다시 해야 합니다.
3. 끝내기 전에 `pnpm run test:e2e`로 전체 시나리오를 한 번 실행합니다. 다른 worktree의 e2e가 실행 중이면 그 실행이 끝난 뒤에 시작합니다. 실행 하나가 CPU를 거의 다 써서, 겹쳐 돌리면 둘 다 느려지고 조회가 timeout을 넘겨 실패합니다.

`next dev`에서 페이지가 끝없이 다시 로드되면(HMR 메시지 `reloadPage: HMR hash mismatch`가 반복됨) `docs/troubleshooting.md`의 절차를 따릅니다. `packages/app/.next/dev`를 지우기 전에 남겨야 할 자료가 그 문서에 있습니다.

## 릴리스

`packages/app/package.json`의 `version`을 올린 커밋을 `main`에 push하면, 그 커밋의 검사(`check.yml`)가 성공한 뒤 `release.yml`이 npm에 게시하고 `v<version>` tag와 GitHub Release를 만듭니다. 그 version이 이미 npm에 있으면 게시하지 않습니다.

1. 저장소 루트 `CHANGELOG.md`의 가장 최근 version 절 위에 `## [<version>] - <YYYY-MM-DD>` 절을 추가하고, 바뀐 내용을 영어로 적습니다. 이 절의 본문(다음 `## ` 제목 앞까지)이 GitHub Release의 노트가 됩니다.
2. `packages/app/package.json`의 `version`을 같은 값으로 바꿉니다.
3. 두 변경을 `main`에 push합니다.

1–2단계와 두 파일만 담은 릴리스 커밋은 프로젝트 skill `/versionup [patch|minor|major]`(Codex에서는 `$versionup`)로 만들 수 있습니다. skill은 push하지 않으므로, 커밋을 검토한 뒤 3단계는 직접 실행합니다.
