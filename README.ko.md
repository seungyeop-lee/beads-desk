# beads-desk

_[English](README.md) · 한국어_

[Beads](https://github.com/steveyegge/beads)(`bd`) 이슈 트래커를 위한 로컬 웹 UI입니다. 이슈 목록, 에픽, 보드, 결정(decision)을 브라우저에서 보고 바로 고칠 수 있습니다. 터미널에서 `bd`로 바꾼 내용도 몇 초 안에 화면에 반영됩니다.

## 요구 사항

- Node.js 22 이상
- pnpm(설치할 때만 필요)
- `bd` CLI. `PATH`에 없으면 `BD_BIN` 환경 변수로 실행 파일 경로를 지정합니다. `bd` 1.3.1에서 동작을 확인했습니다.
- `bd init`으로 만든 beads workspace(`.beads` 디렉터리가 있는 디렉터리)

## 설치

아직 npm에 배포하지 않았으므로 저장소에서 직접 빌드해 전역으로 설치합니다. 전역 명령을 설치할 수 있도록 `pnpm setup`을 한 번 실행해 두어야 합니다.

저장소 루트에서 실행합니다.

```sh
pnpm install
pnpm run install:global
```

저장소를 최신으로 받은 뒤 같은 명령을 다시 실행하면 업데이트됩니다. 실행 중인 서버는 `bd-desk restart`를 실행해야 새 버전으로 바뀝니다.

전역에서 지우려면 `pnpm run uninstall:global`을 실행합니다.

## 사용법

beads workspace 디렉터리나 그 하위 디렉터리에서 실행합니다. `.beads`가 있는 git 저장소의 worktree에서 실행하면 그 worktree를 workspace로 띄우고, bd처럼 main 저장소의 이슈를 보여 줍니다.

```sh
bd-desk start --open
```

서버가 background로 뜨고, 출력된 URL(기본 `http://127.0.0.1:3000`)에서 화면을 볼 수 있습니다. 서버는 이 컴퓨터(`127.0.0.1`)에서 오는 요청만 받습니다.

### 명령

- `bd-desk start`: 서버를 시작합니다. 명령을 생략해도 `start`입니다. 서버가 이미 실행 중이면 새로 띄우지 않고, 지금 디렉터리의 workspace를 추가해 현재 workspace로 바꿉니다.
- `bd-desk stop`: 서버를 종료합니다. 실행 중인 서버가 없으면 종료 코드 2로 끝납니다.
- `bd-desk restart`: 같은 포트로 다시 시작합니다. 추가한 workspace와 현재 workspace는 그대로 이어집니다.

### 옵션

- `--port <번호>`: 서버 포트를 지정합니다. 지정하지 않으면 3000번부터 비어 있는 포트를 씁니다. 실행 중인 서버의 포트를 바꾸려면 `bd-desk restart --port <번호>`를 실행합니다.
- `--open`: 서버가 준비되면 브라우저를 엽니다.

workspace를 둘 이상 추가하면 화면 오른쪽 위의 선택 상자로 바꿀 수 있습니다. 한 탭에서 바꾸면 열려 있는 다른 탭도 함께 바뀝니다.

## 이슈 본문의 로컬 파일 링크

이슈 본문에 절대 경로로 적은 파일 링크와 이미지는 현재 workspace 디렉터리와, 그 git 저장소에 등록된 worktree(`git worktree list`에 나오는 디렉터리), `/tmp` 안에 있을 때 열립니다. 그 밖의 파일을 열면 `허용 범위 밖의 파일입니다.`가 표시됩니다.

`/tmp`는 작업 에이전트 세션이 리포트에 남긴 스크린샷 같은 근거를 바로 열어 확인할 수 있게 포함합니다. OS는 며칠이 지나거나 재부팅하면 `/tmp`의 파일을 지울 수 있으므로, `/tmp` 링크는 즉시 확인용이고 오래 보관되지 않습니다.

다른 디렉터리의 파일도 열려면 `BEADS_DESK_LOCAL_FILE_ROOTS` 환경 변수에 그 디렉터리를 지정해 서버를 시작합니다.

```sh
BEADS_DESK_LOCAL_FILE_ROOTS="<디렉터리>:<다른 디렉터리>" bd-desk start
```

- 여러 디렉터리는 `PATH`처럼 `:`(Windows에서는 `;`)로 구분합니다.
- 절대 경로나 `~`로 시작하는 경로를 씁니다. `~`는 따옴표 안에 있어도 홈 디렉터리로 풀고, 상대 경로는 무시합니다.
- 지정한 디렉터리와 그 하위 파일만 열립니다. symlink는 가리키는 실제 경로로 판단하므로, 지정한 디렉터리 안의 symlink라도 바깥 파일을 가리키면 열리지 않습니다. 존재하지 않는 디렉터리는 건너뜁니다.
- 이 값은 서버가 시작될 때 정해집니다. 서버가 이미 실행 중이면 `bd-desk start`는 workspace만 바꾸고 이 값은 반영하지 않습니다. 값을 바꾸려면 환경 변수를 지정한 채로 `bd-desk restart`를 실행합니다. `restart`할 때 환경 변수를 빠뜨리면 지정했던 디렉터리 없이 다시 시작되므로, 셸 설정 파일에서 `export`해 두는 편이 편합니다.

## 파일 위치

서버 상태 파일(`server.json`)과 로그(`server.log`)는 `$XDG_RUNTIME_DIR/beads-desk`에 둡니다. `XDG_RUNTIME_DIR`이 없으면 OS 임시 디렉터리 아래의 `beads-desk`에 둡니다. 서버가 시작되지 않으면 `server.log`를 확인합니다.

## 문제 해결

- `beads workspace를 찾지 못했습니다`: `.beads`가 있는 디렉터리나 그 하위에서 실행합니다. 처음 쓰는 디렉터리라면 `bd init`을 먼저 실행합니다.
- `경고: 서버가 bd를 실행하지 못했습니다`: `bd`를 `PATH`에 추가하거나 `BD_BIN`을 지정한 뒤 `bd-desk restart`를 실행합니다.
- `실행 중인 서버(pid …)가 응답하지 않습니다`: `bd-desk stop`으로 종료한 뒤 다시 시작합니다.

## 개발

저장소 구조, 검증 명령, 코딩 규칙은 저장소의 `AGENTS.md`에 있습니다.
