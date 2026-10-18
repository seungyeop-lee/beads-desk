# 릴리스 게시 흐름과 문제 해결

릴리스 커밋을 만드는 1–3단계는 저장소 루트 `AGENTS.md`의 "릴리스" 절에 있습니다. `release.yml`을 고친 뒤 확인하는 방법은 `.github/AGENTS.md`에 있습니다.

## 게시 흐름

`main`에 push하면 `.github/workflows/check.yml`이 그 커밋을 검사합니다. 검사가 끝나면 `.github/workflows/release.yml`이 `workflow_run`으로 실행되고, 검사가 실패했으면 아무것도 하지 않고 끝납니다. 검사가 성공했으면 그 커밋의 `packages/app/package.json` `version`을 npm에서 찾고, 이미 있으면 게시하지 않고 끝납니다. 아직 없는 version이면 검사를 다시 하지 않고 그 커밋을 빌드해서 `packages/app/scripts/run-npm-release.mjs publish`로 게시하고 `v<version>` tag와 GitHub Release를 만듭니다.

- `release.yml`은 main push에서 실행한 `check.yml`의 결과로만 게시합니다. PR의 검사가 끝나도 게시하지 않습니다.
- 검사가 하나라도 실패하면 `release.yml`의 job은 실행되지 않고 게시도 하지 않습니다. 고친 커밋을 push하면 version이 아직 npm에 없으므로 그 커밋의 검사가 성공한 뒤에 게시합니다.
- `CHANGELOG.md`에 해당 절이 없거나 본문이 비어 있거나 제목이 날짜로 끝나지 않으면, workflow는 게시하기 전에 실패합니다(수동 실행은 날짜가 없으면 경고만 출력합니다). 날짜를 아직 정하지 않은 절은 `## [<version>] - Unreleased`로 적어 두고 version을 올릴 때 날짜로 바꿉니다. version이 `0.0.0`이 아니면 `pnpm run check`의 unit test(`packages/app/scripts/releaseNotes.test.ts`)도 같은 조건을 검사합니다.

## prerelease

prerelease도 같은 순서로 냅니다. version 뒤에 `-`로 prerelease 부분을 붙이고(예: `0.2.0-beta.1`), CHANGELOG 절 제목에도 그 version을 그대로 적습니다(`## [0.2.0-beta.1] - <YYYY-MM-DD>`). workflow는 version에 prerelease 부분이 있으면 npm에 `next` dist-tag로 게시하고 GitHub Release를 prerelease로 만듭니다. `latest`는 바뀌지 않으므로, version이나 `@next`를 지정하지 않고 설치하는 사용자는 계속 마지막 정식 version을 받습니다.

## 게시 확인

`publish` job이 성공해도 npm에서 새 version이 보이기까지 몇 분 걸릴 수 있습니다. 몇 분 기다린 뒤 `npm view @seungyeop-lee/beads-desk version --prefer-online`으로 확인합니다. 저장소 밖에서 설치해 볼 때 `npm error notarget`이 나오면 로컬 npm 캐시가 오래된 것이므로 `npm install`에 `--prefer-online`을 줍니다.

## tag나 Release 생성이 실패했을 때

게시한 뒤 tag나 Release 생성이 실패하면, workflow를 다시 실행해도 version이 이미 있어서 건너뜁니다. 이때는 `node packages/app/scripts/releaseNotes.mjs <version> > <노트 파일>`로 노트를 뽑아 `gh release create v<version> --target <커밋> --title v<version> --notes-file <노트 파일>`로 직접 만듭니다. prerelease version이면 `--prerelease`도 붙입니다.
