# 문제 해결

개발하다 가끔 생기는 문제와 지금까지 확인한 내용을 적습니다. 원인을 확인하지 못한 문제는 다시 생겼을 때 남길 증거도 함께 적습니다.

## `next dev`에서 페이지가 끝없이 다시 로드됨

### 증상

`next dev`로 띄운 화면이 열리자마자 계속 다시 로드됩니다. 브라우저 개발자 도구의 Network 탭에서 `/_next/hmr` WebSocket을 열면 `{"type":"reloadPage","data":"HMR hash mismatch"}` 메시지가 반복해서 보입니다.

### 해결 절차

개발 서버를 끄고 `packages/app/.next/dev`를 지운 뒤 다시 시작합니다. 지우기 전에 [다시 생기면 남길 증거](#다시-생기면-남길-증거)를 먼저 남깁니다.

### 확인한 사실

원인은 확인하지 못했습니다. 2026-10-14(Next.js 16.4.0)에 다시 생겼을 때 확인한 내용은 다음과 같습니다.

- Next.js 서버는 브라우저가 구독할 때 보낸 `hmrVersion`이 서버의 값과 다르면 이 메시지를 보내 페이지를 다시 로드시킵니다(`node_modules/next/dist/server/dev/hot-reloader-turbopack.js`의 `turbopack-subscribe` 처리). 이 값은 연결된 모든 브라우저 탭이 함께 쓰고, 서버가 브라우저에 변경(Turbopack 업데이트나 server component 변경)을 알릴 때 올라갑니다.
- 증상이 있던 동안에는 앱 client bundle의 chunk 목록 하나(`static/chunks/packages_app_*._.js`)에 대한 Turbopack `restart` 업데이트가, 브라우저가 구독할 때마다 반복됐습니다. Turbopack이 왜 이 업데이트를 반복해 보냈는지는 모릅니다.
- 다음 조건으로는 재현되지 않았습니다.
  - 증상이 있던 서버를 끄고 복사해 둔 `.next/dev`를 다시 올린 뒤 서버 시작
  - 브라우저 두 개를 함께 연결
  - 탭을 열어 둔 채 서버를 다시 시작한 뒤 새 탭 추가
  - 서버가 꺼진 동안 `packages/bd`나 화면 파일을 고친 뒤 서버 시작
- 증상이 있던 때에는 이전 개발 서버 때부터 열려 있던 크롬 탭이 있었습니다. 그 탭이 원인과 관련 있는지는 모릅니다.

`experimental.turbopackFileSystemCacheForDev: false`로 개발 서버의 파일 cache를 끄는 방법도 있지만 쓰지 않았습니다. 복사해 둔 cache로 재현되지 않아 cache가 원인이라는 증거가 없고, cache를 끄면 개발 서버를 다시 시작할 때마다 처음부터 컴파일합니다.

### 다시 생기면 남길 증거

`.next/dev`를 지우기 전에 다음을 남깁니다. `.next/dev` 복사본만으로는 재현되지 않았으므로, 1번과 2번이 원인을 좁히는 데 필요합니다.

1. 개발 서버에 연결된 브라우저 탭을 모두 적습니다. 다른 창과 다른 브라우저도 포함하고, 각 탭이 언제부터 열려 있었는지도 적습니다.
2. 브라우저 개발자 도구의 Network 탭에서 `/_next/hmr` WebSocket을 열고, 반복되는 메시지와 `restart` 업데이트의 대상 chunk를 기록합니다.
3. `packages/app/.next/dev`를 다른 곳에 복사합니다.
