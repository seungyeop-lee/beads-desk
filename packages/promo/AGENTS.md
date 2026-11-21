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

`pnpm --filter promo run video`는 capture가 남긴 녹화로 Remotion을 실행해 소개 영상을 만듭니다. 먼저 capture를 실행하고, GIF 인코딩에 쓸 `ffmpeg`를 설치해 PATH에 둡니다(`ffmpeg -filters`에서 `palettegen`, `paletteuse`를 확인합니다). 처음 실행할 때 Remotion이 렌더링용 Chrome Headless Shell(약 170MB)을 `packages/promo/node_modules/.remotion`에 내려받습니다. MP4와 GIF를 만들면 각각 길이, 해상도, frame rate, 용량을 출력합니다.

- `packages/promo/out/beads-desk-intro.mp4`는 지금 화면에서 마감 목록과 병목 후보를 보여 준 뒤, 오늘 마감인 이슈의 선행·후속 그래프, 결제 화면 이슈의 Mermaid 그림과 스크린샷, 결정과 그 결정이 대체한 이전 결정을 차례로 보여 줍니다. 마지막은 설치 안내입니다(H.264, 1440×900, 25fps).
- `packages/promo/out/beads-desk-intro.gif`는 같은 구간과 효과를 쓰는 README용 GIF입니다(880×550, 약 8.3fps, 무한 반복). ffmpeg는 PNG frame 사이에서 달라진 부분으로 팔레트를 만들고(`palettegen`) 디더링 없이 적용합니다(`paletteuse`). 10MiB를 넘으면 명령이 바이트 수를 출력하고 GIF에서만 **spotlight → 자막 등장 → 카메라 확대** 순으로 하나씩 빼고 다시 만듭니다. 한도 안에 들면 멈추고, 효과를 모두 빼도 넘으면 실패합니다.
- `packages/promo/out/beads-desk-intro.png`는 사이트 hero 카드의 poster입니다. `renderStill`로 MP4와 같은 구성에서 첫 frame을 PNG로 저장합니다.
- `packages/promo/out/`은 저장소에 넣지 않습니다. GIF와 MP4는 `docs/`로, poster는 `docs/screenshots/`로 파일 이름을 그대로 유지해 복사하고 commit합니다.
  - README는 GIF와 스크린샷을 commit SHA로 고정한 `raw.githubusercontent.com` 주소로 넣습니다. 그래야 npmjs.com에서도 이미지가 보입니다. 이미지를 commit한 뒤 README.md, README.ko.md, README.ja.md의 주소를 그 commit의 SHA로 바꿉니다.
  - MP4는 main에 push하면 `.github/workflows/pages.yml`이 GitHub Pages에 배포합니다. 주소가 바뀌지 않으므로 README의 MP4 링크는 고치지 않습니다.

자막과 녹화 구간, 장면별 강조 효과는 `packages/promo/src/video/introTimeline.ts`의 `TOUR`에서 정합니다. 시각은 `captureTargets.ts`의 `tour` 녹화가 남기는 동작 이름(`open-checkout` 등)과 그 동작에서 지난 밀리초로 적고, video 명령이 `tour.events.json`으로 녹화 시각을 풉니다. 동작 이름을 바꾸면 `TOUR`도 함께 바꿉니다.

장면마다 한 종류만 사용합니다. Now와 Graph는 `captions[].enterAt`에 자막 문장을 띄우고, Diagrams와 Screenshots는 `focus`의 영역으로 카메라를 옮깁니다. Decisions는 `spotlights`의 `target`과 `padding` 안쪽을 그대로 두고 주변만 어둡게 했다가 `durationMs` 안에 거둡니다. 상세와 옆 패널이 열릴 때는 전체 화면입니다. `IntroVideo.tsx`와 `BrowserWindow.tsx`는 이 시각에 맞춰 `useGsapTimeline`이 소유한 timeline을 그립니다.

확대 대상을 바꾸려면 `captureTargets.ts`의 `mark`에 대상 이름과 role·이름 기반 locator를 주고 `TOUR.focus`의 `targets`에서 그 이름을 씁니다. capture는 그 시점의 요소 위치를 `tour.events.json`의 `boxes`에 녹화 viewport 기준 CSS 픽셀로 남깁니다. video는 `contain`이면 대상 전체와 `padding`이 들어오게 확대하고, `top`이면 대상의 위쪽과 너비에 맞춥니다. `full`은 측정 없이 전체 화면을 보입니다. 이동을 먼저 시작해 스크롤 뒤의 대상을 보여 줄 때는 `at`에 이동 시각을, `measuredAt`에 스크롤이 끝난 뒤 위치를 잰 동작 이름을 적습니다. 화면 배치가 바뀌면 capture부터 다시 실행합니다.

video 명령은 렌더링하기 전에 아래를 검사하고, 어기면 그 시각을 알리며 실패합니다. 시각은 구간 사이를 빼고 이어 붙인 영상 시각으로 셉니다.

- 카메라 이동이나 spotlight가 클릭 뒤 0.5초와 겹치면 실패합니다. 자막 문장이 다 나타난 뒤 `max(1.2초, 글자 수 ÷ 15)초` 안에 다음 클릭이나 스크롤이 있거나 자막을 읽는 동안 카메라가 두 번 이상 움직여도 실패합니다.
- 효과가 구간의 첫 frame이나 마지막 frame에 걸치거나, 효과가 진행되는 동안 녹화 화면이 로딩이나 스크롤로 크게 바뀌면 실패합니다. 효과 없이 멈춰 있는 화면이 맞는지는 녹화 frame으로 확인합니다.
- 영상 길이가 25–38초인지 봅니다.
- 구간마다 첫 frame과 마지막 frame을 구간 안쪽 1초 동안의 frame과 비교하고, 화면이 크게 다르면 구간과 경계를 알립니다. 경계가 화면을 불러오는 동안에 걸렸거나 경계에서 1초 안에 장면의 동작이 있는 경우이므로, 녹화의 frame을 보고 그 경계를 옮깁니다. 목록이 빈 채로 1초 넘게 머물면, 빈 목록이 나타나고 얼마 지나지 않은 경계는 이 검사를 통과합니다.
