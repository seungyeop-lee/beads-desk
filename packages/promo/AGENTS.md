# promo 도구

README 스크린샷과 소개 영상을 만드는 명령입니다. seed로 데모 workspace를 만들고, capture로 화면과 녹화를 남기고, video로 녹화를 이어 붙여 영상을 만듭니다.

## seed: 데모 workspace 만들기

`pnpm --filter promo run seed <디렉터리>`는 그 디렉터리에 git 저장소와 영어 데모 프로젝트(prefix `acme`)의 bd workspace를 만듭니다. 비어 있거나 전에 seed로 만든 디렉터리만 받고, 전에 만든 디렉터리는 비운 뒤 다시 만듭니다.

데모 이슈 본문이 로컬 파일 링크로 거는 결제 화면 스크린샷과 녹화도 seed가 Playwright의 chromium으로 만들어 workspace의 `qa/`에 둡니다(`src/seed/checkoutAttachments.ts`). chromium이 없으면 seed가 실패하므로, 처음 한 번은 저장소 루트에서 `pnpm run test:e2e:install`을 실행합니다.

README의 Hygiene 스크린샷은 다섯 카드가 한 화면에 들어와야 합니다. 화면은 bd lint의 빠진 섹션 목록 아래에 커밋 카드를 두므로, 데모 이슈를 더할 때는 `acceptance`처럼 bd가 권하는 섹션을 채워 빠진 섹션 목록이 3건 안팎으로 남게 합니다.

`packages/playground`의 수동 테스트 환경도 acme 데이터(`src/seed/acmeProject.ts`)와 workspace를 만드는 `src/seed/seedWorkspace.ts`를 가져다 씁니다. 두 파일이나 `package.json`의 `exports`를 바꾸면 `pnpm playground`를 실행해 함께 확인합니다.

## capture: 화면 캡처와 녹화

`pnpm --filter promo run capture`는 임시 디렉터리 아래 `acme-web`에 데모 workspace를 새로 만들고, 마지막 app build로 서버를 띄워 영어 UI와 라이트 테마로 화면을 캡처합니다. 먼저 `pnpm run build`를 실행하고, chromium이 없으면 `pnpm run test:e2e:install`로 설치합니다. 캡처할 화면과 순서는 `packages/promo/src/capture/captureTargets.ts`의 목록에서 정합니다.

- README 스크린샷은 `docs/screenshots/<이름>.png`에 저장하고 저장소에 commit합니다.
- 소개 영상용 녹화(`<이름>.webm`)와 녹화하는 동안의 클릭, 스크롤, 표시 시각(`<이름>.events.json`)은 `packages/promo/recordings/`에 저장합니다. 이 디렉터리는 저장소에 넣지 않습니다.
- 스크린샷은 1440×900으로, 녹화는 소개 영상에 맞춘 1280×720(`src/video/introTimeline.ts`의 `RECORDING_SIZE`)으로 합니다.
- 이미 만든 데모 workspace를 쓰려면 `--workspace <디렉터리>`를 줍니다. 화면 머리글에 디렉터리 이름이 보이므로 이름은 `acme-web`으로 둡니다.

## video: 소개 영상 만들기

`pnpm --filter promo run video`는 capture가 남긴 녹화로 Remotion을 실행해 소개 영상을 만듭니다. 먼저 capture를 실행합니다. 처음 실행할 때 Remotion이 렌더링용 Chrome Headless Shell(약 170MB)을 `packages/promo/node_modules/.remotion`에 내려받습니다. 명령이 끝나면 파일마다 길이, 해상도, frame rate, 용량을 출력합니다.

- `packages/promo/out/beads-desk-intro.mp4`는 결제 epic 하나를 따라가며 순서 보기, 이슈에 붙인 Mermaid 그림과 스크린샷, 결정과 그 결정이 대체한 이전 결정을 차례로 보이고 설치 안내로 끝나는 영상입니다(H.264, 1440×900, 25fps). 녹화 하나(`tour`)를 잘라 이어 붙이고, 녹화를 줄이거나 키우지 않고 그대로 놓습니다.
- `packages/promo/out/beads-desk-intro.gif`는 README 맨 위에 두는, 같은 영상을 줄인 GIF입니다(880×550, 약 8.3fps). 줄인 크기에서도 글자를 읽을 수 있도록 장면마다 `focus` 영역을 확대합니다. GitHub 이미지 첨부 한도인 10MB를 넘으면 명령이 실패합니다.
- `packages/promo/out/`은 저장소에 넣지 않습니다. README에 쓰려면 두 파일을 `docs/beads-desk-intro.gif`와 `docs/beads-desk-intro.mp4`로 복사해 commit합니다.
  - README는 GIF와 스크린샷을 commit SHA로 고정한 `raw.githubusercontent.com` 주소로 넣습니다. 그래야 npmjs.com에서도 이미지가 보입니다. 이미지를 commit한 뒤 README.md와 README.ko.md의 주소를 그 commit의 SHA로 바꿉니다.
  - MP4는 main에 push하면 `.github/workflows/pages.yml`이 GitHub Pages에 배포합니다. 주소가 바뀌지 않으므로 README의 MP4 링크는 고치지 않습니다.

자막, 녹화에서 잘라 쓰는 구간, GIF에서 확대할 영역은 `packages/promo/src/video/introTimeline.ts`의 `TOUR`에 있습니다. 시각은 `captureTargets.ts`의 `tour` 녹화가 남기는 동작 이름(`open-plan` 등)과 그 동작에서 지난 밀리초로 적고, video 명령이 `tour.events.json`으로 녹화 시각을 풉니다. 그래서 pause 길이나 화면을 불러오는 시간이 바뀌어도 시각을 다시 적지 않아도 됩니다. 동작 이름을 바꾸면 `TOUR`도 함께 바꿉니다. 영역의 좌표는 녹화의 CSS 픽셀이라, 화면 배치가 바뀌면 녹화 frame을 보고 고칩니다.

video 명령은 렌더링하기 전에 아래를 검사하고, 어기면 그 시각을 알리며 실패합니다. 시각은 구간 사이를 빼고 이어 붙인 영상 시각으로 셉니다.

- 확대 영역이 클릭 뒤 0.5초 안에 움직이는지 봅니다. 화면이 바뀌는 모습과 카메라 이동이 겹치면 무엇이 열렸는지 알아보기 어렵습니다.
- 자막이 나타난 뒤 `max(1.2초, 글자 수 ÷ 15)초` 안에 다음 클릭이나 스크롤이 있는지, 확대 영역이 두 번 넘게 움직이는지 봅니다.
- 영상 길이가 25–30초인지 봅니다.
- 구간마다 첫 frame과 마지막 frame을 구간 안쪽 1초 동안의 frame과 비교하고, 화면이 크게 다르면 구간과 경계를 알립니다. 경계가 화면을 불러오는 동안에 걸렸거나 경계에서 1초 안에 장면의 동작이 있는 경우이므로, 녹화의 frame을 보고 그 경계를 옮깁니다. 목록이 빈 채로 1초 넘게 머물면, 빈 목록이 나타나고 얼마 지나지 않은 경계는 이 검사를 통과합니다.
