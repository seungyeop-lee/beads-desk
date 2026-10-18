# npm trusted publisher를 다시 만들 때

`release.yml`이 npm에 인증하는 방식과 trusted publisher에 적는 값은 저장소 루트 `AGENTS.md`의 "릴리스" 절에 있습니다.

새로 만든 trusted publisher는 2일 안에 그 설정으로 한 번 게시해야 검증되고, 그 전까지 화면에 `Pending validation`이 표시됩니다([npm 문서](https://docs.npmjs.com/trusted-publishers/)). 기한을 넘기면 설정이 만료되어 고칠 수 없으므로, 지우고 다시 만든 뒤 2일 안에 version을 올린 커밋을 push해야 합니다. 그래서 아래 순서로 만듭니다.

1. 다음 릴리스 커밋을 `main`에 push하기 직전에 trusted publisher를 만듭니다.
2. 권한에서 direct publish도 허용합니다. 새로 만든 trusted publisher는 권한에 `npm stage publish`만 켜져 있지만, workflow는 `npm publish`로 바로 게시합니다.
3. 2일 안에 version을 올린 커밋을 `main`에 push해, 그 설정으로 게시합니다.
