# launcher와 배포 패키지 확인

## 실행 구조

`bd-desk start`(`bd-desk.js`, 명령을 생략해도 같음)는 패키지에 포함된 `.next` 빌드를 대상으로 `next start`를 background process group으로 실행합니다. 사용자가 명령을 실행한 디렉터리는 `BEADS_DESK_WORKSPACE` 환경 변수로 서버에 전달됩니다.

- workspace는 bd와 같은 기준으로 찾습니다. 지금 디렉터리부터 git 저장소 최상위까지 설정이나 DB 파일이 있는 `.beads`를 찾고, git worktree라 찾지 못했으면 main 저장소의 `.beads`를 확인해 worktree 최상위 디렉터리를 workspace로 씁니다. `.beads`에 `redirect` 파일만 있으면 그 파일이 가리키는 `.beads`에 설정이나 DB 파일이 있을 때만 인정하고, workspace는 redirect 대상이 아니라 redirect를 둔 디렉터리로 씁니다. 이 규칙은 `workspaceRoot.js` 한 곳에 있고, launcher와 서버가 함께 import합니다.
- launcher는 서버 bundle을 불러올 수 없으므로, 둘이 같은 규칙을 써야 하는 코드는 이 디렉터리에 plain JS로 두고 패키지 `files`에도 넣습니다. launcher 실행 파일과 상대 경로 import로 연결된 파일이 `package.json`의 `files`에 포함됐는지는 `packageFiles.test.ts`가 검사하며, 누락되면 `pnpm run check`가 실패합니다. 서버에서 import할 수 있는 이 디렉터리의 파일은 `packages/app/src/server/architecture.test.ts`의 `LAUNCHER_MODULES`에 등록합니다.
- workspace를 찾지 못하면 서버를 띄우거나 바꾸지 않고 종료 코드 1로 끝납니다.
- 서버가 이미 실행 중이면 새로 띄우지 않고, `POST /api/workspaces`로 지금 디렉터리를 등록합니다. 어느 경우든 응답의 workspace 이름으로 그 workspace의 화면 주소(`<서버 URL>/w/<workspace 이름>`)를 출력하고, `--open`이면 그 주소를 엽니다. 주소 형식은 `src/shared/contract/workspaces.ts`의 `workspaceHref`와 같아야 합니다.
- `stop`은 서버가 응답하지 않아도 process group 전체를 종료합니다. 상태 파일의 pid가 서버의 process group 리더가 아니면(pid가 재사용된 경우) 종료하지 않고 상태 파일만 지웁니다.
- `stop`과 `restart`는 `$XDG_RUNTIME_DIR/beads-desk`(없으면 OS 임시 디렉터리 아래 `beads-desk`)의 `server.json`에서 pid와 포트를 읽습니다. 서버 로그는 같은 디렉터리의 `server.log`에 쌓입니다.

## 배포 패키지 설치 확인

배포 패키지 구성(`files`, 의존성, launcher)을 바꿨다면 저장소 밖에서 설치해 실행해 봅니다.

1. `packages/app`에서 `pnpm run pack:local`을 실행해 현재 디렉터리에 tarball을 만듭니다.
2. `npm install -g --prefix <임시 디렉터리> <tarball 경로>`로 설치합니다.
3. bd workspace 디렉터리에서 `XDG_RUNTIME_DIR=<다른 임시 디렉터리> <임시 디렉터리>/bin/bd-desk start`를 실행합니다. `XDG_RUNTIME_DIR`을 따로 주어야 평소에 쓰는 서버의 상태 파일을 건드리지 않습니다.
4. 출력된 URL이 `/w/<3번 디렉터리 이름>`으로 끝나고, 서버 URL의 `/api/health` 응답에서 `runtime.workspaces`에 3번의 디렉터리가 있고 `runtime.bdVersion`이 비어 있지 않으면 정상입니다.
5. 같은 `XDG_RUNTIME_DIR`로 `<임시 디렉터리>/bin/bd-desk stop`을 실행해 서버를 종료합니다.
