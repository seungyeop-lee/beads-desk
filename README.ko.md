# beads-desk

[English](https://github.com/seungyeop-lee/beads-desk/blob/main/README.md) | 한국어

[Beads](https://github.com/steveyegge/beads)(`bd`) 이슈 트래커를 위한 로컬 웹 UI입니다. 사용자와 에이전트가 터미널에서 `bd`를 계속 쓰는 동안, 같은 이슈를 브라우저에서 보고 고칠 수 있습니다.

## 기능

### 지금 할 일 보기

- **지금**: 첫 화면입니다. 진행 중인 이슈, 다음에 할 이슈, 막힌 이슈, 열린 에픽의 진행률과 함께 최근 7일 동안 만들고 닫은 이슈 수를 보여 줍니다.
- **판단 기다림**: 에이전트가 사람에게 넘긴 질문(`human` 라벨이 붙은 이슈)과 확인 요청(human gate)을 한곳에 모읍니다. 이 화면에서 바로 응답하거나 응답 없이 닫을 수 있고, 응답은 댓글로 남습니다. 확인 요청이 닫히면 그 요청이 막고 있던 이슈도 풀립니다.
- **결정**: `decision` 타입 이슈를 별도 화면에서 유효한 결정과 닫힌 결정으로 나눠 보여 주고, 결정마다 대체한 이전 결정과 대체된 새 결정도 함께 보여 줍니다.

### 작업 사이의 관계 보기

- **연결된 이슈**: 이슈 상세에서 그 이슈와 연결된 이슈를 선행, 후속, 상위, 하위, 관련 같은 관계별로 보여 줍니다. 하나를 누르면 지금 보던 이슈 옆 패널에서 그 이슈를 읽을 수 있습니다.
- **그래프**: 연결된 이슈 옆의 선행·후속 그래프를 열면 그 이슈를 둘러싼 blocks 관계를 따라, 먼저 끝내야 할 작업은 왼쪽에, 뒤따르는 작업은 오른쪽에 그립니다. 에픽에서는 순서 보기가 에픽의 이슈를 blocks 의존 관계에 따라 단계로 나누며, 같은 단계의 이슈는 동시에 진행할 수 있습니다.

### 흐름 관리

- **보드**: 막힘, 바로 작업 가능, 진행 중, 닫힘 열로 이루어진 칸반 보드입니다. 카드를 바로 작업 가능, 진행 중, 닫힘 열로 끌어 놓으면 이슈 상태가 그 열에 맞게 바뀝니다.

### CLI와 함께 쓰기

- **실시간 반영**: 사용자나 에이전트가 터미널에서 `bd`로 바꾼 내용이, 새로 고치지 않아도 열려 있는 모든 탭에 몇 초 안에 반영됩니다.

이 밖에 이슈, 에픽, 정리 화면이 있습니다. 화면 문구는 영어와 한국어로 제공되며 브라우저 언어를 따릅니다. 언어를 바꾸려면 화면 오른쪽 위의 톱니바퀴 아이콘을 눌러 설정을 엽니다.

## 요구 사항

- macOS 또는 Linux. macOS에서 `bd` 1.3.1로 테스트했습니다. Windows는 지원하지 않습니다.
- Node.js 22 이상
- `bd` CLI. `bd`가 `PATH`에 없으면 서버를 시작할 때 `BD_BIN` 환경 변수로 실행 파일 경로를 지정합니다.
- beads workspace: `bd init`을 실행해 `.beads` 디렉터리가 생긴 디렉터리

## 설치

npm으로 설치합니다.

```sh
npm install -g @seungyeop-lee/beads-desk
```

pnpm으로 설치합니다. pnpm으로 전역 패키지를 설치한 적이 없다면, pnpm이 전역 실행 파일 디렉터리를 갖도록 이 명령보다 먼저 `pnpm setup`을 한 번 실행하고 새 셸을 엽니다.

```sh
pnpm add -g @seungyeop-lee/beads-desk
```

업데이트하려면 같은 설치 명령을 다시 실행한 뒤, 실행 중인 서버가 새 버전으로 바뀌도록 `bd-desk restart`를 실행합니다.

삭제하려면 먼저 `bd-desk stop`으로 서버를 종료한 뒤 `npm uninstall -g @seungyeop-lee/beads-desk`나 `pnpm remove -g @seungyeop-lee/beads-desk`를 실행합니다.

## 사용법

beads workspace 디렉터리나 그 하위 디렉터리에서 `bd-desk`를 실행합니다.

```sh
bd-desk start --open
```

서버가 background로 시작되고 URL(기본 `http://127.0.0.1:3000`)을 출력합니다. `--open`을 주면 그 URL을 브라우저로 엽니다. 서버는 `127.0.0.1`에서만 요청을 받으므로 이 컴퓨터에서만 화면을 열 수 있습니다. 터미널을 닫아도 서버는 계속 실행됩니다.

다 쓴 뒤에는 서버를 종료합니다.

```sh
bd-desk stop
```

main checkout에 `.beads`가 있는 git 저장소의 worktree에서 실행하면, bd와 마찬가지로 그 worktree를 workspace로 쓰고 main 저장소의 이슈를 보여 줍니다.

### 명령

- `bd-desk start`: 서버를 시작합니다. 명령 없이 `bd-desk`만 실행해도 `start`로 동작합니다. 서버가 이미 실행 중이면 서버를 새로 띄우지 않고, 지금 디렉터리의 workspace를 추가해 그 workspace로 바꿉니다.
- `bd-desk stop`: 서버를 종료합니다. 실행 중인 서버가 없으면 종료 코드 2로 끝납니다.
- `bd-desk restart`: 같은 포트로 서버를 다시 시작하고, 추가한 workspace와 현재 workspace를 그대로 유지합니다. 실행 중인 서버가 없으면 지금 디렉터리의 workspace로 서버를 시작합니다.
- `bd-desk --help`(또는 `-h`): 사용법을 출력합니다.

### 옵션

- `--port <번호>`: 서버 포트를 지정합니다. 지정하지 않으면 3000번부터 비어 있는 첫 포트를 씁니다. 실행 중인 서버는 `start`를 다시 실행해도 포트를 바꾸지 않으므로, 포트를 바꾸려면 `bd-desk restart --port <번호>`를 실행합니다.
- `--open`: 서버가 준비되면 브라우저를 엽니다.
- `--version`(또는 `-v`): 설치된 bd-desk 버전을 출력합니다.

### 여러 workspace 함께 쓰기

다른 beads workspace에서 `bd-desk start`를 실행하면 그 workspace가 실행 중인 서버에 추가됩니다. workspace를 둘 이상 추가하면 화면 오른쪽 위의 선택 상자로 바꿀 수 있습니다. 한 탭에서 바꾸면 열려 있는 다른 탭도 함께 바뀝니다.

## 이슈 본문의 로컬 파일 링크

이슈 본문에 절대 경로로 적은 파일 링크와 이미지는 파일이 다음 디렉터리 안에 있을 때 열립니다.

- 현재 workspace 디렉터리
- 그 git 저장소의 worktree(`git worktree list`에 나오는 디렉터리)
- `/tmp`, `/var/tmp`, OS 임시 디렉터리(macOS의 `$TMPDIR`)

그 밖의 파일을 열면 `허용 범위 밖의 파일입니다.`가 표시됩니다.

임시 디렉터리를 허용하는 것은 에이전트 세션이 리포트에 첨부한 스크린샷 같은 파일을 바로 열어 확인하기 위해서입니다. OS는 며칠이 지나거나 재부팅할 때 `/tmp`와 `$TMPDIR`의 파일을 지울 수 있지만 `/var/tmp`는 재부팅해도 유지됩니다. 따라서 오래 남겨야 하는 기록은 `/tmp`나 `$TMPDIR` 링크에 의존하지 않습니다.

다른 디렉터리의 파일도 열려면 `BEADS_DESK_LOCAL_FILE_ROOTS` 환경 변수에 그 디렉터리를 지정해 서버를 시작합니다.

```sh
BEADS_DESK_LOCAL_FILE_ROOTS="<디렉터리>:<다른 디렉터리>" bd-desk start
```

- 여러 디렉터리는 `PATH`처럼 `:`로 구분합니다.
- 절대 경로나 `~`로 시작하는 경로를 씁니다. 맨 앞의 `~`는 따옴표 안에 있어도 홈 디렉터리로 바뀌고, 상대 경로는 무시됩니다.
- 지정한 디렉터리 안의 파일만 열립니다. symlink는 가리키는 실제 경로로 판단하므로, 지정한 디렉터리 안의 symlink라도 바깥 파일을 가리키면 열리지 않습니다. 존재하지 않는 디렉터리는 건너뜁니다.
- 이 값은 서버가 시작될 때 읽습니다. 서버가 이미 실행 중이면 `bd-desk start`는 workspace만 바꾸고 새 값은 무시합니다. 값을 바꾸려면 환경 변수를 지정한 채로 `bd-desk restart`를 실행합니다. `restart`할 때 환경 변수를 빠뜨리면 추가한 디렉터리 없이 다시 시작되므로, 셸 설정 파일에서 `export`해 두는 편이 좋습니다.

## 파일 위치

서버 상태 파일(`server.json`)과 로그(`server.log`)는 `$XDG_RUNTIME_DIR/beads-desk`에 저장됩니다. `XDG_RUNTIME_DIR`이 설정되지 않았으면 OS 임시 디렉터리 아래의 `beads-desk`에 저장됩니다. 서버가 시작되지 않으면 `server.log`를 확인합니다.

## 문제 해결

CLI는 영어로 출력합니다.

- `No beads workspace found: <디렉터리>`: `.beads`가 있는 디렉터리나 그 하위 디렉터리에서 실행합니다. 새 프로젝트라면 `bd init`을 먼저 실행합니다.
- `Warning: the server could not run bd. Make sure bd is on PATH, or set BD_BIN to its path.`: `bd`를 `PATH`에 추가하거나 `BD_BIN`을 지정한 뒤, 같은 셸에서 `bd-desk restart`를 실행합니다.
- `Port <번호> is already in use.`: `--port`로 지정한 포트를 다른 프로그램이 쓰고 있습니다. 다른 포트를 지정하거나, `--port`를 빼서 비어 있는 첫 포트를 쓰게 합니다.
- `The running server (pid <pid>) is not responding. Stop it with bd-desk stop, then start again.`: `bd-desk stop`을 실행한 뒤 `bd-desk start`를 실행합니다. 같은 문제가 반복되면 `server.log`를 확인합니다.

## 개발

버그 제보와 기능 제안은 GitHub 이슈로 받고, pull request는 받지 않습니다. 이슈를 남기는 방법과 코드를 빌드하고 테스트하는 방법은 [CONTRIBUTING.md](https://github.com/seungyeop-lee/beads-desk/blob/main/CONTRIBUTING.md)에 있습니다.

저장소의 현재 코드를 전역 `bd-desk`로 설치하려면 CONTRIBUTING.md의 개발 환경 준비를 마친 뒤 저장소 루트에서 `pnpm run install:global`을 실행합니다. 이 명령은 `pnpm add -g`로 설치하므로 `pnpm setup`이 만드는 전역 실행 파일 디렉터리가 있어야 합니다. 지우려면 `pnpm run uninstall:global`을 실행합니다.

## 감사의 말

beads-desk는 [mantoni/beads-ui](https://github.com/mantoni/beads-ui)와 그 포크인 [seungyeop-lee/beads-ui](https://github.com/seungyeop-lee/beads-ui)에서 영감을 받았습니다. 두 프로젝트의 포크가 아니라, 클린룸 방식으로 처음부터 새로 작성한 구현입니다.

## 라이선스

[MIT](https://github.com/seungyeop-lee/beads-desk/blob/main/LICENSE)
