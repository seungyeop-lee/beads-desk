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

`beads-desk` 명령(`packages/app/bin/beads-desk.js`)은 패키지에 포함된 `.next` 빌드를 대상으로 `next start`를 실행합니다. 사용자가 명령을 실행한 디렉터리는 `BEADS_DESK_WORKSPACE` 환경 변수로 서버에 전달됩니다.

서버 전체에서 하나만 있어야 하는 상태는 `globalThis`에 둡니다. instrumentation과 route handler는 같은 module을 서로 다른 사본으로 불러오기 때문에 module 변수로는 상태를 공유할 수 없습니다.

- app의 상태(DB 감시 등)는 `packages/app/src/server/infra/` 아래에 구현하고 `src/instrumentation.ts`에서 시작합니다.
- bd 실행 큐는 `@beads-desk/bd`가 첫 호출 때 직접 만듭니다. app에서 bd 실행을 따로 직렬화하지 않습니다.

## 작성 언어

문서, 코드 주석, 커밋 메시지는 한국어로 씁니다. 식별자, 라이브러리 이름, 명령어는 원문을 유지합니다. 커밋 메시지는 Conventional Commits 형식(`type(scope): 제목`)을 따릅니다.

## 검증

`pnpm run check`가 typecheck, lint, format 검사, unit test를 차례로 실행합니다. lefthook이 pre-commit에서 staged 파일의 format과 lint를, pre-push에서 `pnpm run check`를 실행합니다. hook은 `pnpm install` 때 설치됩니다.

배포 패키지 구성(`files`, 의존성, launcher)을 바꿨다면 저장소 밖에서 설치해 실행해 봅니다.

1. `packages/app`에서 `pnpm run pack:local`을 실행해 현재 디렉터리에 tarball을 만듭니다.
2. `npm install -g --prefix <임시 디렉터리> <tarball 경로>`로 설치합니다.
3. bd workspace 디렉터리에서 `BEADS_DESK_NO_OPEN=1 <임시 디렉터리>/bin/beads-desk`를 실행합니다.
4. 출력된 URL의 `/api/health` 응답에서 `runtime.workspaceRoot`가 3번의 디렉터리이고 `runtime.bdVersion`이 비어 있지 않으면 정상입니다.
