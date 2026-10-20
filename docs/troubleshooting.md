# 문제 해결

개발하다 가끔 생기는 문제와 지금까지 확인한 내용을 적습니다. 원인을 확인하지 못한 문제는 다시 생겼을 때 남길 증거도 함께 적습니다.

## route 폴더를 옮긴 뒤 typecheck와 build가 `.next/dev/types`에서 실패함

### 증상

route 폴더를 옮기거나 지운 뒤 `pnpm run typecheck`나 `pnpm run build`가 `.next/dev/types/validator.ts`에서 `Cannot find module '../../../src/app/...'`나 `__InvalidParamMatchingKeys` 오류로 실패합니다.

### 원인

전에 띄운 `next dev`가 만든 route 타입이 옛 경로를 가리킵니다. `packages/app/tsconfig.json`이 `.next/dev/types`를 포함하지만, `next typegen`과 `next build`는 이 파일을 다시 만들지 않습니다.

### 해결 절차

1. 저장소 루트에서 `pnpm dev`를 실행합니다.
2. `Ready`가 출력되면 개발 서버를 끕니다.
3. 실패한 명령을 다시 실행합니다.

## `next dev`에서 페이지가 끝없이 다시 로드됨

### 증상

`next dev`로 띄운 화면이 열리자마자 계속 다시 로드됩니다. 브라우저 개발자 도구의 Network 탭에서 `/_next/hmr` WebSocket을 열면 `{"type":"reloadPage","data":"HMR hash mismatch"}` 메시지가 반복해서 보입니다.

### 해결 절차

개발 서버를 끄고 `packages/app/.next/dev`를 지운 뒤 다시 시작합니다. 지우기 전에 [다시 생기면 남길 증거](#다시-생기면-남길-증거)를 먼저 남깁니다.

### 확인한 사실

원인은 확인하지 못했습니다. 세 번 모두 Next.js 16.4.0에서 생겼습니다.

Next.js 서버는 브라우저가 구독할 때 보낸 `hmrVersion`이 서버의 값과 다르면 이 메시지를 보내 페이지를 다시 로드시킵니다(`node_modules/next/dist/server/dev/hot-reloader-turbopack.js`의 `turbopack-subscribe` 처리). 이 값은 연결된 모든 브라우저 탭이 함께 쓰고, 서버가 브라우저에 변경(Turbopack 업데이트나 server component 변경)을 알릴 때 올라갑니다.

#### 2026-10-14 오전

- 증상이 있던 동안에는 앱 client bundle의 chunk 목록 하나(`static/chunks/packages_app_*._.js`)에 대한 Turbopack `restart` 업데이트가, 브라우저가 구독할 때마다 반복됐습니다. Turbopack이 왜 이 업데이트를 반복해 보냈는지는 모릅니다.
- 다음 조건으로는 재현되지 않았습니다.
  - 증상이 있던 서버를 끄고 복사해 둔 `.next/dev`를 다시 올린 뒤 서버 시작
  - 브라우저 두 개를 함께 연결
  - 탭을 열어 둔 채 서버를 다시 시작한 뒤 새 탭 추가
  - 서버가 꺼진 동안 `packages/bd`나 화면 파일을 고친 뒤 서버 시작
- 증상이 있던 때에는 이전 개발 서버 때부터 열려 있던 크롬 탭이 있었습니다. 그 탭이 원인과 관련 있는지는 모릅니다.

#### 2026-10-14 오후 12시 30분 무렵

- 앞의 개발 서버를 끄고, 서버가 꺼진 동안 화면 파일(`IssueDetailView.tsx`)을 고친 뒤 새 개발 서버를 시작하자 곧바로 생겼습니다. 오전에 재현되지 않은 조건("서버가 꺼진 동안 화면 파일을 고친 뒤 서버 시작")과 비슷하지만, 이번에는 이전 서버 때부터 열려 있던 것으로 보이는 탭이 연결돼 있었습니다.
- Node 클라이언트로 `/_next/hmr`에 10초 동안 접속해 있는 사이, 같은 chunk(`static/chunks/packages_app_1anvha4rlo79g._.js`)에 대한 Turbopack `restart` 업데이트가 계속 들어왔고 `hmrVersion`은 191에서 198로 올랐습니다. 오전과 같은 모습입니다. `reloadPage` 메시지는 서버가 탭마다 따로 보내므로 이 방법으로는 받지 못했습니다.
- 자동화 탭을 `about:blank`로 옮긴 뒤에도 다시 로드 요청이 계속 들어왔습니다. 그때 연결된 크롬 탭은 `/issues?issue=vt-9kj`와 `/issues` 두 개였습니다. `vt-9kj`는 앞의 개발 서버에서만 쓴 임시 workspace의 이슈이므로, 이 탭은 그때부터 열려 있었다고 추론합니다.
- 연결된 탭이 받은 HMR 메시지와, 그 탭을 닫으면 반복이 멈추는지는 확인하지 못했습니다.
- `.next/dev`를 복사해 둔 뒤 지우고 개발 서버를 다시 시작하자 반복이 멈췄습니다.

#### 2026-10-20 오전 8시 40분 무렵

- main에 화면 파일을 바꾼 커밋 세 개를 merge한 뒤 `pnpm playground`로 개발 서버를 시작했습니다. 서버는 이전과 다른 포트에 떴고, 연결된 브라우저는 Playwright headless chromium 탭 하나뿐이었습니다. 사람이 연 크롬 탭이나 이전 개발 서버 때부터 열려 있던 탭은 없었으므로, 이 문제는 그런 탭이 없어도 생깁니다. 앞의 두 번에 있던 그런 탭이 원인과 관련 있는지는 여전히 모릅니다.
- 그 탭이 `/epics`를 처음 열자마자 다시 로드가 30초 동안 20번 정도 반복됐고, 서버 로그에는 `GET /epics`와 `✓ Compiled in 4ms`가 번갈아 찍혔습니다.
- 새 headless 탭을 열어 `/_next/hmr` 메시지를 6초 동안 받자 `{"type":"reloadPage","data":"HMR hash mismatch"}`가 2번 왔고, 10월 14일 오후와 같은 chunk(`static/chunks/packages_app_1anvha4rlo79g._.js`)에 대한 Turbopack `restart` 업데이트가 반복됐습니다. 그동안 `hmrVersion`은 320에서 321로 올랐습니다.
- `sync` 메시지의 `versionInfo`는 설치된 버전을 16.4.0, 기대 버전을 16.4.2(`stale-patch`)로 알렸습니다. 16.4.2에서도 생기는지는 확인하지 못했습니다.
- 개발 서버를 끄고 `.next/dev`를 복사해 둔 뒤 지운 다음, 테스트 데이터 workspace는 그대로 둔 채(`--keep`) `pnpm playground`를 다시 시작했습니다. 같은 방법으로 받은 메시지에는 `reloadPage`가 없었습니다.

`experimental.turbopackFileSystemCacheForDev: false`로 개발 서버의 파일 cache를 끄는 방법도 있지만 쓰지 않았습니다. 복사해 둔 cache로 재현되지 않아 cache가 원인이라는 증거가 없고, cache를 끄면 개발 서버를 다시 시작할 때마다 처음부터 컴파일합니다.

### 다시 생기면 남길 증거

`.next/dev`를 지우기 전에 다음을 남깁니다. `.next/dev` 복사본만으로는 재현되지 않았으므로, 1번과 2번이 원인을 좁히는 데 필요합니다.

1. 개발 서버에 연결된 브라우저 탭을 모두 적습니다. 다른 창과 다른 브라우저도 포함하고, 각 탭이 언제부터 열려 있었는지도 적습니다.
2. 브라우저 개발자 도구의 Network 탭에서 `/_next/hmr` WebSocket을 열고, 반복되는 메시지와 `restart` 업데이트의 대상 chunk를 기록합니다.
3. `packages/app/.next/dev`를 다른 곳에 복사합니다.
