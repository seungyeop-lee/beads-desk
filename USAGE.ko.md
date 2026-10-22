# beads-desk 사용 안내

[English](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.md) | 한국어

설치 방법은 [README](https://github.com/seungyeop-lee/beads-desk/blob/main/README.ko.md#시작하기)에 있습니다.

## 명령

`bd-desk`는 beads workspace 디렉터리나 그 하위 디렉터리에서 실행합니다.

- `bd-desk start`: 서버를 background에서 시작하고, 지금 디렉터리의 workspace를 여는 URL(예: `http://127.0.0.1:3000/w/my-project`)을 출력합니다. 터미널을 닫아도 서버는 계속 실행됩니다. 명령 없이 `bd-desk`만 실행해도 `start`로 동작합니다. 서버가 이미 실행 중이면 새로 띄우지 않고, 지금 디렉터리의 workspace를 추가한 뒤 그 workspace의 URL을 출력합니다.
- `bd-desk stop`: 서버를 종료합니다. 실행 중인 서버가 없으면 종료 코드 2로 끝납니다.
- `bd-desk restart`: 추가한 workspace와 그 URL을 유지한 채 같은 포트로 서버를 다시 시작합니다. 지금 디렉터리의 workspace가 추가돼 있으면 그 workspace의 URL을, 아니면 서버 URL을 출력합니다. 실행 중인 서버가 없으면 지금 디렉터리의 workspace로 서버를 시작합니다.
- `bd-desk --help`(또는 `-h`): 사용법을 출력합니다.

workspace가 Dolt 서버를 쓰도록 설정돼 있으면(server mode), `bd-desk stop`은 beads-desk 서버만 종료하고 bd가 띄운 Dolt 서버는 계속 실행됩니다. bd는 Dolt 서버를 자신을 실행한 bd 명령보다 오래 살아 있도록 별도의 background process로 띄웁니다. Dolt 서버를 끄려면 workspace 디렉터리에서 `bd dolt stop`을 실행합니다. workspace를 지우거나 옮길 때는 그 전에 이 명령으로 Dolt 서버를 끕니다. shared-server mode에서는 이 컴퓨터의 모든 beads 프로젝트가 Dolt 서버 하나를 함께 쓰므로, `bd dolt stop`을 실행하면 다른 프로젝트가 쓰는 서버도 함께 꺼집니다.

main checkout에 `.beads`가 있는 git 저장소라면, 그 저장소의 worktree에서 실행해도 됩니다. bd와 마찬가지로 worktree를 workspace로 쓰고, main 저장소의 이슈를 보여 줍니다.

## 옵션

- `--port <번호>`: 서버 포트를 지정합니다. 지정하지 않으면 3000번부터 비어 있는 첫 포트를 씁니다. 이미 실행 중인 서버는 `start`를 다시 실행해도 포트가 바뀌지 않으므로, 포트를 바꾸려면 `bd-desk restart --port <번호>`를 실행합니다.
- `--open`: 서버가 준비되면 브라우저를 엽니다.
- `--version`(또는 `-v`): 설치된 bd-desk 버전을 출력합니다.

## 여러 workspace 함께 쓰기

모든 화면 URL은 `/w/<workspace 이름>`으로 시작하므로, 주소창에서 지금 보는 workspace를 알 수 있습니다. workspace 이름은 디렉터리 이름이고, 공백과 URL에 그대로 쓸 수 없는 문자는 `_`로 바뀝니다. 추가한 workspace끼리 디렉터리 이름이 같으면 나중에 추가한 쪽에 `-2`, `-3`처럼 번호가 붙습니다.

서버가 실행 중일 때 다른 beads workspace에서 `bd-desk start`를 실행하면, 그 workspace가 서버에 추가되고 URL이 출력됩니다. 탭마다 자기 URL의 workspace를 보여 주므로, 여러 workspace를 서로 다른 탭이나 창에 띄워 두고 함께 볼 수 있습니다. 화면 오른쪽 위의 선택 상자는 지금 탭만 다른 workspace로 옮깁니다.

`http://127.0.0.1:3000/issues`처럼 workspace 이름이 없는 URL은, 추가한 workspace가 하나면 그 workspace의 같은 화면을 엽니다. workspace가 여럿이면 어느 workspace로 열지 고르는 화면이 나옵니다.

## `bd`로 바꾼 내용이 화면에 나타나는 방식

탭이 열려 있는 동안 서버는 workspace의 데이터베이스가 바뀌었는지 확인하고, 바뀌었으면 열려 있는 탭에 데이터를 다시 읽게 합니다. 그래서 사용자나 에이전트가 터미널에서 `bd`로 바꾼 내용이 새로 고치지 않아도 몇 초 안에 나타납니다. embedded mode에서는 Dolt 데이터베이스의 `.dolt/noms/manifest` 파일을, server mode에서는 `bd sql`로 조회한 데이터베이스 hash(`DOLT_HASHOF_DB()`)를 비교합니다.

## 브라우저 알림

에이전트가 사람의 판단을 기다릴 때 알림을 받으려면, 설정을 열고 **판단 기다림이 생기면 알리기**를 켭니다. 처음 켤 때 브라우저가 알림 권한을 묻습니다. 브라우저가 이 사이트의 알림을 차단했으면, 주소창 옆의 사이트 설정에서 알림을 허용하기 전까지 켤 수 없습니다.

- beads-desk 탭에 열려 있는 workspace에 판단 기다림이 새로 생기면 알림이 뜹니다. 알림을 켜거나 탭을 열 때 이미 있던 항목은 알리지 않습니다.
- 탭을 여러 개 열어 두어도 새 항목마다 알림은 한 번만 뜹니다.
- 그 workspace를 포커스된 탭에서 보고 있는 동안에는 알림이 뜨지 않습니다.
- 알림을 누르면 그 workspace의 판단 기다림 화면이 새 탭으로 열립니다.
- 설정과 권한은 서버 주소마다 따로 저장됩니다. 서버가 다른 포트로 뜨면 알림을 다시 켭니다.

## 이슈 본문의 로컬 파일 링크

이슈 본문에 절대 경로로 적은 파일 링크와 이미지는 앱 안에서 열립니다. Windows에서는 `C:\Users\me\report.md`나 `C:/Users/me/report.md`처럼 드라이브 문자로 시작하는 경로도 쓸 수 있습니다. 파일은 다음 디렉터리 안에 있을 때만 열립니다.

- 탭의 URL에 있는 workspace의 디렉터리
- 그 git 저장소의 worktree(`git worktree list`에 나오는 디렉터리)
- OS 임시 디렉터리(macOS의 `$TMPDIR`, Windows의 `%TEMP%`)
- `/tmp`와 `/var/tmp`(macOS와 Linux만 해당)

이 밖의 파일을 열면 `허용 범위 밖의 파일입니다.`가 표시됩니다.

임시 디렉터리를 허용하는 이유는 에이전트 세션이 리포트에 첨부한 스크린샷 같은 파일을 바로 열어 보기 위해서입니다. OS는 며칠이 지나거나 재부팅할 때 `/tmp`와 `$TMPDIR`의 파일을 지울 수 있으므로, 오래 남겨야 하는 기록은 이 두 디렉터리의 파일로 링크하지 않습니다. `/var/tmp`의 파일은 재부팅해도 남습니다.

다른 디렉터리의 파일도 열려면, 그 디렉터리를 `BEADS_DESK_LOCAL_FILE_ROOTS` 환경 변수에 넣고 서버를 시작합니다.

```sh
BEADS_DESK_LOCAL_FILE_ROOTS="<디렉터리>:<다른 디렉터리>" bd-desk start
```

Windows의 PowerShell에서는 다음과 같이 지정합니다.

```powershell
$env:BEADS_DESK_LOCAL_FILE_ROOTS = "<디렉터리>;<다른 디렉터리>"
bd-desk start
```

- 디렉터리가 여러 개면 `PATH`처럼 `:`로 구분합니다. Windows에서는 `;`로 구분합니다.
- 절대 경로나 `~`로 시작하는 경로를 씁니다. 맨 앞의 `~`는 따옴표 안에 있어도 홈 디렉터리로 바뀌고, Windows에서는 `~/`뿐 아니라 `~\`도 홈 디렉터리로 바뀝니다. 상대 경로는 무시됩니다.
- 지정한 디렉터리 안의 파일만 열립니다. symlink는 가리키는 실제 경로로 판단하므로, 지정한 디렉터리 안에 있는 symlink라도 바깥 파일을 가리키면 열리지 않습니다. 존재하지 않는 디렉터리는 건너뜁니다.
- 이 값은 서버가 시작될 때만 읽습니다. 서버가 이미 실행 중이면 `bd-desk start`는 workspace만 추가하고 새 값은 무시하므로, 값을 바꾸려면 환경 변수를 지정한 채 `bd-desk restart`를 실행합니다. `restart`할 때 환경 변수를 빠뜨리면 추가한 디렉터리 없이 다시 시작되므로, 셸 설정 파일에 지정해 두는 편이 좋습니다.

열린 파일은 확장자에 따라 다음과 같이 보입니다.

- `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`: 이미지로 보입니다.
- `.webm`, `.mp4`: 영상으로 재생됩니다.
- 그 밖의 확장자(HTML, SVG, 스크립트 파일 포함): 앱과 같은 origin에서 실행되지 않도록 텍스트로 보입니다.

로컬 파일 링크와 `https://` 같은 외부 주소 링크는 새 탭에서 열리므로, 보던 이슈 화면이 그대로 남습니다. `/epics` 같은 앱 화면 링크는 지금 탭에서 이동합니다.

`.diff`, `.patch`, `.log`, `.txt` 파일 링크는 파일 이름 앞에 chevron이 붙은 칩으로 보입니다. 칩을 누르거나, 칩에 focus를 두고 Enter나 Space를 누르면 이슈 화면을 떠나지 않고 링크가 든 문단이나 목록 항목 바로 아래에 파일 내용이 펼쳐지고, 한 번 더 하면 접힙니다. 파일 원문을 새 탭에서 열려면 칩 바로 오른쪽의 ↗ 아이콘을 누르거나, 칩을 Cmd/Ctrl을 누른 채 클릭하거나 가운데 버튼으로 클릭합니다. `.diff`와 `.patch`는 추가·삭제 줄을 구분해 칠하고, `.log`와 `.txt`는 원문 그대로 보여 줍니다. 내용이 길면 펼친 상자 안에서 스크롤합니다. 1 MB를 넘는 파일은 내용을 불러오지 않고, 미리보기를 생략했다는 문구와 파일을 새 탭에서 여는 링크를 보여 줍니다. 칩과 아이콘은 본문을 편집하지 않을 때만 나오고, 편집하는 동안에는 이 링크들도 보통 링크로 보입니다.

## 업데이트와 삭제

업데이트하려면 설치 명령을 다시 실행한 뒤 `bd-desk restart`를 실행합니다. 그래야 실행 중인 서버가 새 버전으로 바뀝니다.

삭제하려면 먼저 `bd-desk stop`으로 서버를 종료한 뒤, `npm uninstall -g @seungyeop-lee/beads-desk`나 `pnpm remove -g @seungyeop-lee/beads-desk`를 실행합니다.

## 파일 위치

서버 상태 파일(`server.json`)과 로그(`server.log`)는 `$XDG_RUNTIME_DIR/beads-desk`에 저장됩니다. `XDG_RUNTIME_DIR`이 설정되어 있지 않으면 OS 임시 디렉터리 아래의 `beads-desk`에 저장되고, Windows에서는 이 디렉터리가 `%TEMP%\beads-desk`입니다.

## 문제 해결

서버가 시작되지 않으면 먼저 `server.log`([파일 위치](#파일-위치) 참고)를 확인합니다. CLI 메시지는 영어로만 출력됩니다.

- `No beads workspace found: <디렉터리>`: `.beads`가 있는 디렉터리나 그 하위 디렉터리에서 실행합니다. 새 프로젝트라면 먼저 `bd init`을 실행합니다.
- `Warning: the server could not run bd. Make sure bd is on PATH, or set BD_BIN to its path.`(macOS, Linux): `bd`를 `PATH`에 추가하거나 `BD_BIN`을 지정한 뒤, 같은 셸에서 `bd-desk restart`를 실행합니다.
- `Warning: the server could not run bd. Make sure bd.exe is on PATH, or set BD_BIN to the full path of bd.exe.`(Windows): `bd.exe`가 있는 디렉터리를 `PATH`에 추가하거나 `BD_BIN`에 `bd.exe`의 전체 경로를 지정한 뒤, 같은 셸에서 `bd-desk restart`를 실행합니다. pnpm이나 volta로 bd를 설치했다면 `BD_BIN`에 `bd.cmd` shim이 아니라 `bd.exe`를 지정합니다. PowerShell에서는 다음과 같이 실행합니다.

  ```powershell
  $env:BD_BIN = "<bd.exe의 전체 경로>"
  bd-desk restart
  ```

- `Port <번호> is already in use.`: `--port`로 지정한 포트를 다른 프로그램이 쓰고 있습니다. 다른 포트를 지정하거나, `--port`를 빼고 실행해 비어 있는 첫 포트를 쓰게 합니다.
- `The running server (pid <pid>) is not responding. Stop it with bd-desk stop, then start again.`: `bd-desk stop`을 실행한 뒤 다시 `bd-desk start`를 실행합니다. 같은 문제가 반복되면 `server.log`를 확인합니다.
