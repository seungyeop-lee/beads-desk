# Agents

## 프로젝트 개요

`bd`(Beads) CLI를 사용하는 로컬 웹 UI입니다. 서버가 `bd`를 `child_process.spawn`으로 실행하고, 그 출력을 화면에 보여 줍니다.

`bd`는 이 프로젝트가 수정할 수 없는 외부 의존성입니다. `bd`의 출력이나 명령 형식이 부족하면 서버 쪽 adapter에서 보완하거나 그 한계를 받아들입니다. upstream 변경을 전제로 설계하지 않습니다.

## 패키지 구성

| 경로           | 패키지                      | 역할                                                           |
| -------------- | --------------------------- | -------------------------------------------------------------- |
| `packages/app` | `@seungyeop-lee/beads-desk` | npm으로 배포하는 Next.js 앱과 `beads-desk` 실행 명령           |
| `packages/bd`  | `@beads-desk/bd`            | `bd` CLI 실행과 출력 해석. Next.js와 React에 의존하지 않습니다 |

`packages/bd` 같은 내부 패키지는 빌드 때 app의 server bundle에 포함되므로 app의 `devDependencies`에만 둡니다. `dependencies`에 넣으면 게시된 패키지를 설치할 때 찾을 수 없는 의존성이 됩니다.

## 실행 구조

`beads-desk start`(`packages/app/bin/beads-desk.js`, 명령을 생략해도 같음)는 패키지에 포함된 `.next` 빌드를 대상으로 `next start`를 background process group으로 실행합니다. 사용자가 명령을 실행한 디렉터리는 `BEADS_DESK_WORKSPACE` 환경 변수로 서버에 전달됩니다.

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
- 디렉터리는 함께 바뀌는 기능 이름으로 묶습니다. `utils`, `helpers`, `common` 같은 역할 이름 디렉터리는 만들지 않습니다.

import 제한은 `eslint.config.js`가, layer 방향과 디렉터리 구조는 `packages/app/src/server/architecture.test.ts`가, 파일 단위 순환은 oxlint의 `import/no-cycle`이 검사합니다. 경계를 바꾸면 이 검사들도 함께 고칩니다.

## 작성 언어

문서, 코드 주석, 커밋 메시지는 한국어로 씁니다. 식별자, 라이브러리 이름, 명령어는 원문을 유지합니다. 커밋 메시지는 Conventional Commits 형식(`type(scope): 제목`)을 따릅니다.

## 검증

`pnpm run check`가 typecheck, lint, format 검사, unit test를 차례로 실행합니다. lefthook이 pre-commit에서 staged 파일의 format과 lint를, pre-push에서 `pnpm run check`를 실행합니다. hook은 `pnpm install` 때 설치됩니다.

`next dev`가 실행 중일 때 `packages/bd`를 고치면, 서버를 다시 시작하기 전까지 API가 고치기 전의 코드로 bd를 실행합니다. bd 패키지를 고친 뒤 화면이나 API로 확인하려면 `next dev`를 다시 시작합니다.

배포 패키지 구성(`files`, 의존성, launcher)을 바꿨다면 저장소 밖에서 설치해 실행해 봅니다.

1. `packages/app`에서 `pnpm run pack:local`을 실행해 현재 디렉터리에 tarball을 만듭니다.
2. `npm install -g --prefix <임시 디렉터리> <tarball 경로>`로 설치합니다.
3. bd workspace 디렉터리에서 `XDG_RUNTIME_DIR=<다른 임시 디렉터리> <임시 디렉터리>/bin/beads-desk start`를 실행합니다. `XDG_RUNTIME_DIR`을 따로 주어야 평소에 쓰는 서버의 상태 파일을 건드리지 않습니다.
4. 출력된 URL의 `/api/health` 응답에서 `runtime.workspaceRoot`가 3번의 디렉터리이고 `runtime.bdVersion`이 비어 있지 않으면 정상입니다.
5. 같은 `XDG_RUNTIME_DIR`로 `<임시 디렉터리>/bin/beads-desk stop`을 실행해 서버를 종료합니다.
