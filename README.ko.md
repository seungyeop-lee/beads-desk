# beads-desk

[English](https://github.com/seungyeop-lee/beads-desk/blob/main/README.md) | 한국어

에이전트가 [Beads](https://github.com/gastownhall/beads)(`bd`)에 남긴 기록을 검토하는 로컬 웹 UI입니다. 에이전트가 세운 계획, 기록한 결정, 첨부한 그림과 스크린샷, 사람에게 남긴 질문을 브라우저에서 읽을 수 있습니다. 사용자와 에이전트가 터미널에서 `bd`를 쓰는 동안에도, 같은 이슈를 브라우저에서 보고 고칠 수 있습니다.

[![beads-desk demo: an epic's stages, an issue with a sequence diagram, a screenshot, and a screen recording attached, a decision and the one it replaced, and a human gate answered so the work it held moves to Ready](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/beads-desk-intro.gif)](https://seungyeop-lee.github.io/beads-desk/beads-desk-intro.mp4)

## 기능

### 계획을 단계별로 검토하기

에픽에서 순서 보기를 열면 에픽의 이슈를 `blocks` 관계에 따라 단계로 나누고, 어느 단계가 진행 중인지 보여 줍니다. human gate와 에픽 밖에서 막고 있는 이슈도 같은 그래프에 나오고, 같은 단계에 있는 이슈는 동시에 진행할 수 있습니다. 이슈를 누르면 그래프 옆에서 그 이슈를 읽을 수 있습니다.

어느 이슈에서든 선행·후속 그래프로 그 이슈 앞뒤의 작업을 이어 볼 수 있고, 이슈마다 그 이슈를 기다리는 이슈가 몇 개인지 나옵니다.

![View order for an epic arranging its issues into five stages, with a human gate holding the last stage](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/graph.png)

### 에이전트가 첨부한 자료 읽기

이슈 설명과 댓글의 Markdown을 그려 보여 주고, Mermaid 그림도 그립니다. 그림을 누르면 크게 볼 수 있습니다. 절대 경로로 건 로컬 파일 링크는 앱 안에서 열립니다. 이미지는 이슈 안에 보이고, `.webm`과 `.mp4` 녹화는 재생됩니다. 어느 디렉터리의 파일을 열 수 있는지는 [이슈 본문의 로컬 파일 링크](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ko.md#이슈-본문의-로컬-파일-링크)에 있습니다.

![Issue detail showing a Mermaid sequence diagram and, below it, a screenshot of a checkout page from a local file](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/attachments.png)

### 결정 기록 남기기

`decision` 타입 이슈를 따로 모아 유효한 결정과 닫힌 결정으로 나눠 보여 줍니다. 결정마다 그 결정이 대체한 결정과 그 결정을 대체한 결정이 링크로 나오므로, 이전 결정이 왜 바뀌었는지 따라가 볼 수 있습니다.

![Decisions screen splitting active and closed decisions, with supersedes and superseded-by links](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/decisions.png)

### 에이전트의 질문에 답하기

판단 기다림 화면은 에이전트가 사람에게 넘긴 질문(`human` 라벨이 붙은 이슈)과 확인 요청(human gate)을, 각 확인 요청이 막고 있는 작업과 함께 모아 보여 줍니다. 이 화면에서 바로 응답하거나 응답 없이 닫을 수 있습니다. 응답은 댓글로 남고, 확인 요청을 닫으면 그 요청을 기다리던 이슈도 풀립니다.

![Needs human screen with a response typed for the selected gate and the task that gate blocks](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/needs-human.png)

### 트래커 정리하기

정리 화면은 오래 방치된 이슈, 커밋 메시지에 ID가 나오지만 아직 열린 이슈, `bd`가 이슈 유형마다 권하는 섹션이 빠진 이슈, 중복 후보, 하위 이슈가 모두 닫힌 에픽을 보여 줍니다. 중복 후보는 같은 화면에서 한쪽을 다른 쪽의 중복으로 닫을 수 있습니다.

![Hygiene screen with stale issues, possible duplicates, missing sections, epics ready to close, and orphaned issues](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/hygiene.png)

### 그 밖의 기능

첫 화면인 지금은 진행 중인 이슈, 다음에 할 이슈, 막힌 이슈를 보여 주고, 열린 에픽이 얼마나 진행됐는지와 최근 7일 동안 만들고 닫은 이슈 수도 함께 보여 줍니다. 이 밖에 카드를 끌어 놓아 상태를 바꾸는 보드, 이슈와 에픽 화면, 보던 이슈를 떠나지 않고 연결된 이슈를 읽는 옆 패널이 있습니다. `bd`로 바꾼 내용은 몇 초 안에 열려 있는 모든 탭에 나타나고, 이슈는 `bd` CLI로만 읽고 바꿉니다. 탭마다 다른 workspace를 볼 수 있습니다. 화면은 영어와 한국어를 지원하고 브라우저 언어를 따릅니다. 언어나 테마를 바꾸려면 화면 오른쪽 위, 새 이슈 버튼 왼쪽에 있는 설정 버튼을 누릅니다.

![Now screen showing counts of in-progress, ready, blocked, and needs-human issues, a 7-day created and closed chart, and the in-progress and blocked lists](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/b654b5299ec134cfb05a9137f272378f8fcdbdb2/docs/screenshots/now.png)

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
