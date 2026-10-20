# beads-desk 사용 안내

[English](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md) | 한국어

설치 방법은 [README](https://github.com/seungyeop-lee/beads-desk/blob/main/README.ko.md#시작하기)에 있습니다.

## 명령

`bd-desk`는 beads workspace 디렉터리나 그 하위 디렉터리에서 실행합니다.

- `bd-desk start`: 서버를 background에서 시작하고 URL(기본값 `http://127.0.0.1:3000`)을 출력합니다. 터미널을 닫아도 서버는 계속 실행됩니다. 명령 없이 `bd-desk`만 실행해도 `start`로 동작합니다. 서버가 이미 실행 중이면 새로 띄우지 않고, 지금 디렉터리의 workspace를 추가한 뒤 그 workspace로 바꿉니다.
- `bd-desk stop`: 서버를 종료합니다. 실행 중인 서버가 없으면 종료 코드 2로 끝납니다.
- `bd-desk restart`: 추가한 workspace와 현재 workspace를 유지한 채 같은 포트로 서버를 다시 시작합니다. 실행 중인 서버가 없으면 지금 디렉터리의 workspace로 서버를 시작합니다.
- `bd-desk --help`(또는 `-h`): 사용법을 출력합니다.

main checkout에 `.beads`가 있는 git 저장소라면, 그 저장소의 worktree에서 실행해도 됩니다. bd와 마찬가지로 worktree를 workspace로 쓰고, main 저장소의 이슈를 보여 줍니다.

## 옵션

- `--port <번호>`: 서버 포트를 지정합니다. 지정하지 않으면 3000번부터 비어 있는 첫 포트를 씁니다. 이미 실행 중인 서버는 `start`를 다시 실행해도 포트가 바뀌지 않으므로, 포트를 바꾸려면 `bd-desk restart --port <번호>`를 실행합니다.
- `--open`: 서버가 준비되면 브라우저를 엽니다.
- `--version`(또는 `-v`): 설치된 bd-desk 버전을 출력합니다.

## 여러 workspace 함께 쓰기

서버가 실행 중일 때 다른 beads workspace에서 `bd-desk start`를 실행하면, 그 workspace가 서버에 추가됩니다. workspace가 둘 이상이면 화면 오른쪽 위의 선택 상자에서 바꿀 수 있습니다. 한 탭에서 바꾸면 열려 있는 다른 탭도 함께 바뀝니다.

## 이슈 본문의 로컬 파일 링크

이슈 본문에 절대 경로로 적은 파일 링크와 이미지는, 파일이 다음 디렉터리 안에 있을 때만 열립니다.

- 현재 workspace 디렉터리
- 그 git 저장소의 worktree(`git worktree list`에 나오는 디렉터리)
- `/tmp`, `/var/tmp`, OS 임시 디렉터리(macOS의 `$TMPDIR`)

이 밖의 파일을 열면 `허용 범위 밖의 파일입니다.`가 표시됩니다.

임시 디렉터리를 허용하는 이유는 에이전트 세션이 리포트에 첨부한 스크린샷 같은 파일을 바로 열어 보기 위해서입니다. OS는 며칠이 지나거나 재부팅할 때 `/tmp`와 `$TMPDIR`의 파일을 지울 수 있으므로, 오래 남겨야 하는 기록은 이 두 디렉터리의 파일로 링크하지 않습니다. `/var/tmp`의 파일은 재부팅해도 남습니다.

다른 디렉터리의 파일도 열려면, 그 디렉터리를 `BEADS_DESK_LOCAL_FILE_ROOTS` 환경 변수에 넣고 서버를 시작합니다.

```sh
BEADS_DESK_LOCAL_FILE_ROOTS="<디렉터리>:<다른 디렉터리>" bd-desk start
```

- 디렉터리가 여러 개면 `PATH`처럼 `:`로 구분합니다.
- 절대 경로나 `~`로 시작하는 경로를 씁니다. 맨 앞의 `~`는 따옴표 안에 있어도 홈 디렉터리로 바뀌고, 상대 경로는 무시됩니다.
- 지정한 디렉터리 안의 파일만 열립니다. symlink는 가리키는 실제 경로로 판단하므로, 지정한 디렉터리 안에 있는 symlink라도 바깥 파일을 가리키면 열리지 않습니다. 존재하지 않는 디렉터리는 건너뜁니다.
- 이 값은 서버가 시작될 때만 읽습니다. 서버가 이미 실행 중이면 `bd-desk start`는 workspace만 바꾸고 새 값은 무시하므로, 값을 바꾸려면 환경 변수를 지정한 채 `bd-desk restart`를 실행합니다. `restart`할 때 환경 변수를 빠뜨리면 추가한 디렉터리 없이 다시 시작되므로, 셸 설정 파일에서 `export`해 두는 편이 좋습니다.

열린 파일은 확장자에 따라 다음과 같이 보입니다.

- `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`: 이미지로 보입니다.
- `.webm`, `.mp4`: 영상으로 재생됩니다.
- 그 밖의 확장자(HTML, SVG, 스크립트 파일 포함): 앱과 같은 origin에서 실행되지 않도록 텍스트로 보입니다.

## 업데이트와 삭제

업데이트하려면 설치 명령을 다시 실행한 뒤 `bd-desk restart`를 실행합니다. 그래야 실행 중인 서버가 새 버전으로 바뀝니다.

삭제하려면 먼저 `bd-desk stop`으로 서버를 종료한 뒤, `npm uninstall -g @seungyeop-lee/beads-desk`나 `pnpm remove -g @seungyeop-lee/beads-desk`를 실행합니다.

## 파일 위치

서버 상태 파일(`server.json`)과 로그(`server.log`)는 `$XDG_RUNTIME_DIR/beads-desk`에 저장됩니다. `XDG_RUNTIME_DIR`이 설정되어 있지 않으면 OS 임시 디렉터리 아래의 `beads-desk`에 저장됩니다.

## 문제 해결

서버가 시작되지 않으면 먼저 `server.log`([파일 위치](#파일-위치) 참고)를 확인합니다. CLI 메시지는 영어로만 출력됩니다.

- `No beads workspace found: <디렉터리>`: `.beads`가 있는 디렉터리나 그 하위 디렉터리에서 실행합니다. 새 프로젝트라면 먼저 `bd init`을 실행합니다.
- `Warning: the server could not run bd. Make sure bd is on PATH, or set BD_BIN to its path.`: `bd`를 `PATH`에 추가하거나 `BD_BIN`을 지정한 뒤, 같은 셸에서 `bd-desk restart`를 실행합니다.
- `Port <번호> is already in use.`: `--port`로 지정한 포트를 다른 프로그램이 쓰고 있습니다. 다른 포트를 지정하거나, `--port`를 빼고 실행해 비어 있는 첫 포트를 쓰게 합니다.
- `The running server (pid <pid>) is not responding. Stop it with bd-desk stop, then start again.`: `bd-desk stop`을 실행한 뒤 다시 `bd-desk start`를 실행합니다. 같은 문제가 반복되면 `server.log`를 확인합니다.
