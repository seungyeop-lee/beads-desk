# promo 도구

README 스크린샷과 소개 영상을 만드는 명령입니다. seed로 데모 workspace를 만들고, capture로 화면과 녹화를 남기고, video로 녹화를 이어 붙여 영상을 만듭니다.

## seed: 데모 workspace 만들기

`pnpm --filter promo run seed <디렉터리>`는 그 디렉터리에 git 저장소와 영어 데모 프로젝트(prefix `acme`)의 bd workspace를 만듭니다. 비어 있거나 전에 seed로 만든 디렉터리만 받고, 전에 만든 디렉터리는 비운 뒤 다시 만듭니다.

## capture: 화면 캡처와 녹화

`pnpm --filter promo run capture`는 임시 디렉터리 아래 `acme-web`에 데모 workspace를 새로 만들고, 마지막 app build로 서버를 띄워 영어 UI와 라이트 테마로 화면을 캡처합니다. 먼저 `pnpm run build`를 실행하고, chromium이 없으면 `pnpm run test:e2e:install`로 설치합니다. 캡처할 화면과 순서는 `packages/promo/src/capture/captureTargets.ts`의 목록에서 정합니다.

- README 스크린샷은 `docs/screenshots/<이름>.png`에 저장하고 저장소에 commit합니다.
- 소개 영상용 녹화(`<이름>.webm`)는 `packages/promo/recordings/`에 저장합니다. 이 디렉터리는 저장소에 넣지 않습니다.
- 이미 만든 데모 workspace를 쓰려면 `--workspace <디렉터리>`를 줍니다. 화면 머리글에 디렉터리 이름이 보이므로 이름은 `acme-web`으로 둡니다. gate 응답과 카드 이동 녹화가 그 workspace의 이슈를 바꾸므로, 같은 workspace로 다시 캡처하기 전에 seed로 다시 만듭니다.

## video: 소개 영상 만들기

`pnpm --filter promo run video`는 capture가 남긴 녹화로 Remotion을 실행해 소개 영상을 만듭니다. 먼저 capture를 실행합니다. 처음 실행할 때 Remotion이 렌더링용 Chrome Headless Shell(약 170MB)을 `packages/promo/node_modules/.remotion`에 내려받습니다. 명령이 끝나면 파일마다 길이, 해상도, frame rate, 용량을 출력합니다.

- `packages/promo/out/beads-desk-intro.mp4`는 Needs human(hero), Now, 그래프, Decisions, 보드, 설치 안내를 이어 붙인 전체 영상입니다(H.264, 1600×900, 25fps).
- `packages/promo/out/beads-desk-intro.gif`는 README 맨 위에 두는, 같은 영상을 줄인 GIF입니다(960×540, 6.25fps). GitHub 이미지 첨부 한도인 10MB를 넘으면 명령이 실패합니다.
- `packages/promo/out/`은 저장소에 넣지 않습니다.

장면 순서, 자막, 녹화에서 잘라 쓰는 구간은 `packages/promo/src/video/introTimeline.ts`에 있습니다. 구간은 녹화 시각으로 적혀 있으므로, `captureTargets.ts`에서 장면의 동작이나 pause 길이를 바꾸면 구간도 함께 고칩니다.

렌더링하기 전에 구간마다 첫 frame과 마지막 frame을 구간 안쪽 1초 동안의 frame과 비교하고, 화면이 크게 다르면 장면과 경계(`fromMs`·`toMs`)를 알리며 실패합니다. 경계가 화면을 불러오는 동안에 걸렸거나 경계에서 1초 안에 장면의 동작이 있는 경우이므로, 녹화의 frame을 보고 그 경계를 옮깁니다. 목록이 빈 채로 1초 넘게 머물면, 빈 목록이 나타나고 얼마 지나지 않은 경계는 이 검사를 통과합니다.
