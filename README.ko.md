# beads-desk

[English](https://github.com/seungyeop-lee/beads-desk/blob/main/README.md) | 한국어

에이전트가 [Beads](https://github.com/gastownhall/beads)(`bd`)에 남긴 기록을 검토하는 로컬 웹 UI입니다. 에이전트가 세운 계획, 기록한 결정, 첨부한 그림과 스크린샷, 사람에게 남긴 질문을 브라우저에서 읽을 수 있습니다. 사용자와 에이전트가 터미널에서 `bd`를 쓰는 동안에도, 같은 이슈를 브라우저에서 보고 고칠 수 있습니다.

[![beads-desk demo: an epic's stages, an issue with a sequence diagram, a screenshot, and a screen recording attached, a decision and the one it replaced, and a human gate answered so the work it held moves to Ready](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/566ae44df8b0b73dfcca541c7dcdc4fa706f182c/docs/beads-desk-intro.gif)](https://seungyeop-lee.github.io/beads-desk/beads-desk-intro.mp4)

## 기능

### 계획을 단계별로 검토하기

- 에픽의 **순서 보기**는 에픽의 이슈를 `blocks` 관계에 따라 단계로 나누고, 진행 중인 단계를 표시합니다.
- human gate와 에픽 밖에서 막고 있는 이슈도 같은 그래프에 나옵니다.
- **선행·후속 그래프**는 어느 이슈에서든 그 이슈 앞뒤의 작업을 이어 보여 줍니다.

![View order for an epic arranging its issues into five stages, with a human gate holding the last stage](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/566ae44df8b0b73dfcca541c7dcdc4fa706f182c/docs/screenshots/graph.png)

### 에이전트가 첨부한 자료 읽기

- 설명과 댓글의 Markdown과 Mermaid 그림을 그려 보여 줍니다. 그림을 누르면 크게 볼 수 있습니다.
- [로컬 파일 링크](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ko.md#이슈-본문의-로컬-파일-링크)는 앱 안에서 열립니다. 이미지는 이슈 안에 보이고, `.webm`과 `.mp4` 녹화는 재생됩니다.

![Issue detail showing a Mermaid sequence diagram and, below it, a screenshot of a checkout page from a local file](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/566ae44df8b0b73dfcca541c7dcdc4fa706f182c/docs/screenshots/attachments.png)

### 결정 기록 남기기

- `decision` 타입 이슈를 따로 모아 유효한 결정과 닫힌 결정으로 나눠 보여 줍니다.
- 결정마다 그 결정이 대체한 결정과 그 결정을 대체한 결정이 링크로 나옵니다.

![Decisions screen splitting active and closed decisions, with supersedes and superseded-by links](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/566ae44df8b0b73dfcca541c7dcdc4fa706f182c/docs/screenshots/decisions.png)

### 에이전트의 질문에 답하기

- **판단 기다림** 화면은 사람에게 넘긴 질문(`human` 라벨이 붙은 이슈)과 확인 요청(human gate)을, 각 확인 요청이 막고 있는 작업과 함께 모아 보여 줍니다.
- 이 화면에서 바로 응답하거나 응답 없이 닫을 수 있습니다. 확인 요청을 닫으면 그 뒤에 있던 작업이 풀립니다.
- [브라우저 알림](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ko.md#브라우저-알림)을 켜면 다른 창에서 일하는 중에도 새 항목을 알 수 있습니다.

![Needs human screen with a response typed for the selected gate and the task that gate blocks](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/566ae44df8b0b73dfcca541c7dcdc4fa706f182c/docs/screenshots/needs-human.png)

### 자리를 비운 동안 생긴 일 보기

- **활동** 화면은 workspace 전체에서 이슈를 만들고 닫고 댓글을 단 기록을 새것부터 보여 줍니다.
- **여기부터 지난번에 본 기록** 구분선이 지난번에 어디까지 봤는지 표시합니다.

![Activity screen listing issues created, closed, and commented on today, with a Seen on your last visit divider above older records](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/8298eb03d1c5f8d114d227e172172979d0c1fbcb/docs/screenshots/activity.png)

### 트래커 정리하기

- **정리** 화면은 오래 방치된 이슈, 커밋에 언급됐지만 아직 열린 이슈, `bd`가 권하는 섹션이 빠진 이슈, 중복 후보, 닫을 수 있는 에픽을 찾아 줍니다.
- 중복 후보는 같은 화면에서 중복으로 닫을 수 있습니다.

![Hygiene screen with stale issues, possible duplicates, missing sections, epics ready to close, and orphaned issues](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/566ae44df8b0b73dfcca541c7dcdc4fa706f182c/docs/screenshots/hygiene.png)

### 그 밖의 기능

| 화면 | 보여 주는 것                                                          |
| ---- | --------------------------------------------------------------------- |
| 지금 | 진행 중인 이슈, 다음에 할 이슈, 막힌 이슈, 에픽 진행률, 최근 7일 차트 |
| 이슈 | 작업 상태별 전체 이슈, 필터, 본문과 댓글까지 찾는 검색                |
| 에픽 | 열린 에픽과 닫힌 에픽의 진행률, ID나 제목으로 찾는 검색               |
| 보드 | 끌어 놓아 상태를 바꾸는 카드                                          |

- 옆 패널로 보던 이슈 옆에 연결된 이슈를 열어 읽을 수 있습니다.
- 모든 읽기와 변경은 `bd` CLI를 거치고, `bd`로 바꾼 내용은 몇 초 안에 열린 탭에 나타납니다.
- 탭마다 다른 workspace를 볼 수 있습니다.
- 화면은 영어와 한국어, 라이트와 다크 테마를 지원하며 **설정**에서 바꿉니다.

![Now screen showing counts of in-progress, ready, blocked, and needs-human issues, a 7-day created and closed chart, and the in-progress and blocked lists](https://raw.githubusercontent.com/seungyeop-lee/beads-desk/566ae44df8b0b73dfcca541c7dcdc4fa706f182c/docs/screenshots/now.png)

## 요구 사항

- macOS 또는 Linux. macOS에서 `bd` 1.3.1로 테스트했고, Windows는 지원하지 않습니다.
- Node.js 22 이상
- `bd` CLI. `bd`가 `PATH`에 없으면 서버를 시작할 때 `BD_BIN` 환경 변수에 실행 파일 경로를 넣습니다.
- beads workspace: `bd init`을 실행한 디렉터리

## 시작하기

1. npm으로 설치합니다.

   ```sh
   npm install -g @seungyeop-lee/beads-desk
   ```

   pnpm으로도 설치할 수 있습니다. pnpm으로 전역 패키지를 설치한 적이 없다면 먼저 `pnpm setup`을 한 번 실행하고 새 셸을 엽니다.

   ```sh
   pnpm add -g @seungyeop-lee/beads-desk
   ```

2. beads workspace 디렉터리나 그 하위 디렉터리에서 서버를 시작합니다.

   ```sh
   bd-desk start --open
   ```

   서버는 background에서 실행되고 브라우저에 화면을 엽니다. `127.0.0.1`에서만 요청을 받으므로 이 컴퓨터에서만 화면을 열 수 있습니다.

- **중지:** `bd-desk stop`을 실행합니다.
- **업데이트:** 설치 명령을 다시 실행한 뒤 `bd-desk restart`를 실행합니다. 바뀐 내용은 [변경 내역](https://github.com/seungyeop-lee/beads-desk/blob/main/CHANGELOG.md)에 있습니다.
- **더 보기:** [사용 안내](https://github.com/seungyeop-lee/beads-desk/blob/main/USAGE.ko.md)에 명령, 옵션, 여러 workspace 함께 쓰기, 알림, 로컬 파일 링크, 삭제, 문제 해결이 있습니다.

## 기여

버그 제보와 기능 제안은 GitHub 이슈로 받고, pull request는 받지 않습니다. 자세한 내용은 [CONTRIBUTING.md](https://github.com/seungyeop-lee/beads-desk/blob/main/CONTRIBUTING.md)를 참고해 주세요.

## 감사의 말

beads-desk는 [mantoni/beads-ui](https://github.com/mantoni/beads-ui)에서 영감을 받았습니다.

## 라이선스

[MIT](https://github.com/seungyeop-lee/beads-desk/blob/main/LICENSE)
