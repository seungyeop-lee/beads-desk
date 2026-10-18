# beads-desk

[English](https://github.com/seungyeop-lee/beads-desk/blob/main/README.md) | 한국어

[Beads](https://github.com/gastownhall/beads)(`bd`) 이슈 트래커를 브라우저에서 쓰는 로컬 웹 UI입니다. 사용자와 에이전트가 터미널에서 `bd`를 쓰는 동안에도, 같은 이슈를 브라우저에서 보고 고칠 수 있습니다.

[![beads-desk demo: answering a human gate in Needs human unblocks the work it held back, followed by the Now, Graph, Decisions, and Board screens](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/6dd972f29742ee8ea5d0d91ceb0245062718e0ab/docs/beads-desk-intro.gif)](https://github.com/seungyeop-lee/beads-desk/releases/download/v0.1.0/beads-desk-intro.mp4)

## 기능

### 지금 할 일 보기

- **지금**: 첫 화면입니다. 진행 중인 이슈, 다음에 할 이슈, 막힌 이슈를 보여 주고, 열린 에픽이 얼마나 진행됐는지와 최근 7일 동안 만들고 닫은 이슈 수도 함께 보여 줍니다.

  ![Now screen showing counts of in-progress, ready, blocked, and needs-human issues, a 7-day created and closed chart, and the in-progress and blocked lists](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/f01c0ef35da18cff8eab618a3bc0999d5e40f643/docs/screenshots/now.png)

- **판단 기다림**: 에이전트가 사람에게 넘긴 질문(`human` 라벨이 붙은 이슈)과 확인 요청(human gate)을 모아, 이 화면에서 바로 응답하거나 응답 없이 닫을 수 있습니다. 응답은 댓글로 남고, 확인 요청을 닫으면 그 요청을 기다리던 이슈도 풀립니다.

  ![Needs human screen listing two human gates and one question, with a response form for the selected gate](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/3fd01240cdbd8061fa15122d40a9f0c65bd833bd/docs/screenshots/needs-human.png)

- **결정**: `decision` 타입 이슈만 따로 모아 유효한 결정과 닫힌 결정으로 나눠 보여 줍니다. 결정마다 어떤 결정을 대체했는지, 어떤 결정으로 대체됐는지도 나옵니다.

  ![Decisions screen splitting active and closed decisions, with supersedes and superseded-by links](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/f01c0ef35da18cff8eab618a3bc0999d5e40f643/docs/screenshots/decisions.png)

### 작업 사이의 관계 보기

- **연결된 이슈**: 이슈 상세에서 선행, 후속, 상위, 하위, 관련 이슈를 관계별로 보여 줍니다. 하나를 누르면 보던 이슈 옆 패널에 그 이슈가 열립니다.

  ![Issue detail with a linked issue open in a side panel that lists its parent, blocked-by, and blocks issues](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/3fd01240cdbd8061fa15122d40a9f0c65bd833bd/docs/screenshots/linked-issues.png)

- **그래프**: 이슈에서 선행·후속 그래프를 열면, 그 이슈를 중심으로 blocks 관계를 따라 먼저 끝내야 할 작업을 왼쪽에, 뒤이어 할 작업을 오른쪽에 그립니다. 에픽에서는 순서 보기가 에픽의 이슈를 blocks 관계에 따라 단계로 나누고, 같은 단계에 있는 이슈는 동시에 진행할 수 있습니다.

  ![View order for an epic arranging its issues into five stages by their blocks dependencies](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/3fd01240cdbd8061fa15122d40a9f0c65bd833bd/docs/screenshots/graph.png)

### 흐름 관리

- **보드**: 막힘, 바로 작업 가능, 진행 중, 닫힘 열이 있는 칸반 보드입니다. 카드를 바로 작업 가능, 진행 중, 닫힘 열로 끌어 놓으면 이슈 상태가 바뀝니다.

  ![Board with Blocked, Ready, In progress, and Closed columns of issue cards](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/3fd01240cdbd8061fa15122d40a9f0c65bd833bd/docs/screenshots/board.png)

### CLI와 함께 쓰기

- **실시간 반영**: 사용자나 에이전트가 터미널에서 `bd`로 바꾼 내용이 몇 초 안에 열려 있는 모든 탭에 나타납니다. 새로 고칠 필요가 없습니다.

이 밖에 이슈, 에픽, 정리 화면도 있습니다. 화면은 영어와 한국어를 지원하고 브라우저 언어를 따릅니다. 언어나 테마를 바꾸려면 화면 오른쪽 위, 새 이슈 버튼 왼쪽에 있는 설정 버튼을 누릅니다.

## 요구 사항

- macOS 또는 Linux. macOS에서 `bd` 1.3.1로 테스트했고, Windows는 지원하지 않습니다.
- Node.js 22 이상
- `bd` CLI. `bd`가 `PATH`에 없으면 서버를 시작할 때 `BD_BIN` 환경 변수에 실행 파일 경로를 넣습니다.
- beads workspace: `bd init`을 실행한 디렉터리

## 시작하기

npm으로 설치합니다.

```sh
npm install -g @seungyeop-lee/beads-desk
```

pnpm으로도 설치할 수 있습니다. pnpm으로 전역 패키지를 설치한 적이 없다면 먼저 `pnpm setup`을 한 번 실행하고 새 셸을 엽니다.

```sh
pnpm add -g @seungyeop-lee/beads-desk
```

beads workspace 디렉터리나 그 하위 디렉터리에서 서버를 시작합니다.

```sh
bd-desk start --open
```

서버가 background에서 실행되고 브라우저에 화면이 열립니다. 서버는 `127.0.0.1`에서만 요청을 받으므로 이 컴퓨터에서만 화면을 열 수 있습니다. 서버를 끄려면 `bd-desk stop`을 실행합니다.

최신 버전으로 업데이트하려면 설치 명령을 다시 실행한 뒤 `bd-desk restart`를 실행합니다. 그래야 실행 중인 서버가 새 버전으로 바뀝니다. 버전마다 바뀐 내용은 [변경 내역](https://github.com/seungyeop-lee/beads-desk/blob/main/CHANGELOG.md)에서 확인할 수 있습니다.

명령과 옵션, 여러 workspace 함께 쓰기, 이슈 본문의 로컬 파일 링크, 삭제, 문제 해결은 [사용 안내](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ko.md)에 있습니다.

## 기여

버그 제보와 기능 제안은 GitHub 이슈로 받고, pull request는 받지 않습니다. 자세한 내용은 [CONTRIBUTING.md](https://github.com/seungyeop-lee/beads-desk/blob/main/CONTRIBUTING.md)를 참고해 주세요.

## 감사의 말

beads-desk는 [mantoni/beads-ui](https://github.com/mantoni/beads-ui)에서 영감을 받았습니다.

## 라이선스

[MIT](https://github.com/seungyeop-lee/beads-desk/blob/main/LICENSE)
