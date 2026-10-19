---
name: versionup
description: 사용자가 `/versionup`(Codex에서는 `$versionup`)으로 beads-desk의 다음 릴리스를 준비해 달라고 직접 요청할 때만 사용합니다. 올릴 단계로 patch, minor, major 중 하나를 받거나 생략합니다.
argument-hint: "[patch|minor|major]"
disable-model-invocation: true
---

# versionup

`main`에 push하기만 하면 `.github/workflows/release.yml`이 게시하도록, `CHANGELOG.md`와 `packages/app/package.json`의 version을 올린 릴리스 커밋 하나를 만듭니다. 릴리스 규칙은 `docs/release.md`와 `release.yml`에 있고, 이 skill은 `docs/release.md` "릴리스 커밋 만들기" 절의 1–2단계를 대신 실행합니다. 이 skill이 그 둘과 어긋나는 곳을 발견하면 skill에 맞추지 말고 멈춘 뒤 어긋난 곳을 사용자에게 알립니다.

**이 skill은 push, npm 게시, tag와 GitHub Release 생성을 하지 않습니다.** 사용자가 커밋을 검토한 뒤 직접 push합니다.

모든 명령은 저장소 루트에서 실행합니다.

## 1. 인수 읽기

올릴 단계는 사용자가 skill을 부를 때 함께 준 말에서 읽습니다. Claude Code에서 `/versionup minor`로 부르면 skill 본문 끝에 `ARGUMENTS: minor`가 붙고, Codex에서는 `$versionup minor`처럼 사용자의 메시지에 들어 있습니다.

- `patch`, `minor`, `major` 중 하나이면 그 단계를 씁니다.
- 아무것도 없으면 3단계에서 커밋을 보고 단계를 고릅니다.
- 그 밖의 값이면 아무것도 바꾸지 않고 사용법 `/versionup [patch|minor|major]`(Codex에서는 `$versionup [patch|minor|major]`)를 알린 뒤 멈춥니다.

## 2. 실행 전 확인

아래 조건 중 하나라도 맞지 않으면 그 내용을 알리고 멈춥니다.

1. `git branch --show-current`가 `main`을 출력합니다.
2. `git status --porcelain`이 아무것도 출력하지 않습니다.
3. `node -p 'require("./packages/app/package.json").version'`으로 읽은 지금 version에 prerelease 부분(`-` 뒤)이 없습니다.
4. 마지막 릴리스의 tag `v<지금 version>`이 있습니다. `git rev-parse -q --verify refs/tags/v<지금 version>`이 실패하면 `git fetch --tags`로 받아 온 뒤 다시 확인합니다. 그래도 없으면 멈추고, 지난 릴리스가 게시되지 않았거나 tag 생성이 실패했을 수 있다고 알립니다. 게시는 됐는데 tag가 없으면 `docs/release.md`에 tag와 Release를 직접 만드는 방법이 있습니다.
5. `pnpm run check`가 통과합니다. 1–4가 모두 맞을 때 마지막으로 실행합니다. 실패하면 실패한 검사와 출력을 알리고, 아직 아무 파일도 바꾸지 않았으므로 문제를 고쳐 커밋한 뒤 skill을 바로 다시 실행하면 된다고 안내합니다.

## 3. 올릴 단계 정하기

마지막 릴리스 이후의 커밋과 바뀐 파일을 읽습니다.

```sh
git log --format='--- %h %s%n%b' --name-only v<지금 version>..HEAD
```

사용자에게 보이는 변경은 배포 패키지의 동작을 바꾸는 커밋입니다. 아래 두 조건을 모두 만족하는 커밋만 셉니다.

- 배포 패키지에 들어가는 파일을 바꿨습니다: `packages/app/src`, `packages/app/bin`, `packages/bd/src`의 테스트가 아닌 파일, `packages/app/package.json`의 `dependencies`·`engines`·`bin`·`files`, `packages/app/next.config.ts`. 테스트 파일(`*.test.ts`, `*.test.tsx`, `packages/bd/src/realBd`, `packages/bd/src/fixtures`), `packages/app/e2e`, `packages/app/scripts`, `packages/promo`, `.github`, `docs/`, `AGENTS.md`, README와 USAGE 같은 문서는 내부 변경입니다.
- type이 아래 표에서 단계를 정하는 type입니다. `refactor`, `test`, `docs`, `style`, `chore`, `ci`처럼 동작을 바꾸지 않는 type은 세지 않습니다.

| 커밋                                                                                 | 단계                                    |
| ------------------------------------------------------------------------------------ | --------------------------------------- |
| breaking change: 제목이 `type!:` 또는 `type(scope)!:`이거나 본문에 `BREAKING CHANGE` | major. 지금 version이 `0.x.y`이면 minor |
| `feat`                                                                               | minor                                   |
| `fix`, `perf`, 그 밖에 배포 패키지의 동작을 바꾸는 커밋                              | patch                                   |

센 커밋 가운데 가장 높은 단계를 고릅니다. `0.x.y`에서 `1.0.0`으로는 사용자가 `major`를 직접 준 경우에만 올립니다.

- 센 커밋이 없으면 릴리스할 변경이 없다고 알리고 멈춥니다. 인수를 받았어도 멈춥니다. CHANGELOG 절의 본문이 비면 workflow가 게시 전에 실패합니다.
- 인수 없이 실행했으면 고른 단계와 그 근거가 된 커밋(hash와 제목)을 사용자에게 알립니다.
- 인수를 받았는데 커밋으로 판단한 단계와 다르면, 그 차이를 알리되 인수의 단계를 씁니다.

## 4. 새 version 계산과 npm 확인

지금 version `X.Y.Z`에 단계를 적용합니다: patch는 `X.Y.(Z+1)`, minor는 `X.(Y+1).0`, major는 `(X+1).0.0`입니다.

```sh
npm view @seungyeop-lee/beads-desk@<새 version> version --prefer-online
```

- 새 version을 출력하면 이미 게시된 version이므로 멈춥니다.
- `E404`로 실패하면 아직 없는 version이므로 계속합니다.
- 그 밖의 실패(네트워크 오류 등)는 게시 여부를 알 수 없으므로 출력을 보여 주고 멈춥니다.

## 5. CHANGELOG 절 쓰기

저장소 루트 `CHANGELOG.md`에 새 version의 절을 씁니다. 날짜는 `date +%F`의 오늘 날짜입니다.

- `## [<새 version>] - Unreleased` 절이 이미 있으면 제목의 `Unreleased`를 오늘 날짜로 바꾸고, 그 절에 빠진 변경을 보탭니다.
- 다른 version의 `Unreleased` 절이 있으면 어느 version으로 낼지 알 수 없으므로 멈추고 알립니다.
- 둘 다 없으면 가장 최근 version 절(첫 번째 `## [` 제목) 바로 위에 `## [<새 version>] - <오늘 날짜>` 절을 추가합니다.

본문은 영어로, 파일 머리말의 Keep a Changelog 1.1.0 형식을 따라 씁니다.

- 3단계에서 센 커밋만 적습니다. 내부 변경은 적지 않습니다.
- 변경을 `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security` 소제목(`### `) 아래 이 순서로 나누고, 항목이 없는 소제목은 넣지 않습니다.
- 커밋 메시지는 한국어이므로 그대로 옮기지 않습니다. 제목만으로 무엇이 바뀌었는지 알 수 없으면 `git show <hash>`로 diff를 읽고, 사용자가 화면이나 CLI에서 겪는 변화를 영어 문장으로 다시 씁니다. 화면과 버튼 이름은 `packages/app/src/client/modules/locale/domain/enMessages.ts`의 영어 문구를 씁니다.
- 같은 기능을 고친 여러 커밋은 항목 하나로 합칩니다. 커밋 hash와 bd 이슈 ID는 적지 않습니다.
- 문장 형식은 이전 version 절을 따릅니다.

## 6. package.json 갱신

`packages/app/package.json`의 `"version"` 값만 새 version으로 바꿉니다. 다른 줄과 들여쓰기는 건드리지 않습니다.

## 7. 검사

5–6단계에서 바꾼 두 파일만 검사합니다. 나머지 코드는 2단계의 `pnpm run check`에서 이미 검사했습니다.

```sh
pnpm exec vitest run packages/app/scripts/releaseNotes.test.ts
pnpm exec oxfmt --check CHANGELOG.md packages/app/package.json
```

- `releaseNotes.test.ts`는 `CHANGELOG.md`에 새 version의 날짜가 적힌 절이 있고 본문이 비어 있지 않은지 검사합니다.
- `oxfmt --check`는 두 파일이 `pnpm run check`의 format 검사를 통과하는지 확인합니다.

실패하면 원인은 5–6단계에서 쓴 내용이므로, 실패 출력을 보고 두 파일을 고친 뒤 두 명령을 모두 다시 실행합니다. 둘 다 통과하면 8단계로 넘어갑니다.

- `releaseNotes.test.ts`가 실패하면 5–6단계의 규칙대로 CHANGELOG 절이나 version 값을 고칩니다.
- `oxfmt --check`가 실패하면 `pnpm exec oxfmt CHANGELOG.md packages/app/package.json`으로 고칩니다.
- 검사마다 한 번만 고칩니다. 한 번 고친 검사가 다시 실패하면 커밋하지 않고, 바꾼 파일을 그대로 둔 채 실패한 검사와 출력을 알리고 멈춥니다. 이때 skill을 다시 실행하려면 `git restore CHANGELOG.md packages/app/package.json`으로 두 파일을 먼저 되돌려야 한다고 함께 알립니다.

## 8. 커밋

두 파일만 stage해 커밋 하나로 만듭니다. git hook을 건너뛰지 않습니다(`--no-verify` 금지).

```sh
git add CHANGELOG.md packages/app/package.json
git commit -m "<메시지>"
```

메시지는 Conventional Commits 형식의 한국어이고, 5단계에서 절을 어떻게 썼는지에 따라 고릅니다.

- 새 절을 추가했으면 `chore(release): app version을 <새 version>(으)로 올리고 CHANGELOG에 <새 version> 절을 추가한다`
- `Unreleased` 절에 날짜를 적었으면 `chore(release): app version을 <새 version>(으)로 올리고 CHANGELOG의 <새 version> 절에 릴리스 날짜를 적는다`

`(으)로`는 version의 마지막 숫자를 읽은 소리에 맞춥니다. 마지막 숫자가 0, 3, 6이면 `으로`, 그 밖에는 `로`를 씁니다(`0.2.0으로`, `0.1.1로`).

## 9. 안내

사용자에게 아래 내용을 알립니다.

- 커밋 hash와 제목, 지금 version과 새 version, 고른 단계와 그 근거가 된 커밋
- push하지 않았다는 것. 커밋을 검토한 뒤 `main`을 push하면 `.github/workflows/check.yml`이 검사하고, 통과하면 `.github/workflows/release.yml`이 npm에 게시한 뒤 `v<새 version>` tag와 GitHub Release를 만듭니다.
- 게시 뒤 확인할 것: `publish` job이 성공해도 npm에서 새 version이 보이기까지 몇 분 걸릴 수 있습니다. 몇 분 기다린 뒤 `npm view @seungyeop-lee/beads-desk version --prefer-online`이 새 version을 출력하는지 확인합니다.
