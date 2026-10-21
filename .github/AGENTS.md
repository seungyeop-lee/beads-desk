# workflow 수정과 act 확인

`.github/workflows/`를 바꿨다면 push하기 전에 [act](https://github.com/nektos/act)로 바꾼 job을 실행해 봅니다. act의 결과가 GitHub-hosted runner(x64 `ubuntu-latest`)의 결과와 같지는 않으므로, 최종 확인은 PR의 GitHub Actions 실행 결과로 합니다. act가 container에 복사하는 파일, `--rm`을 뺐을 때 남는 container, cache, GitHub runner와 달라지는 점은 `docs/act.md`에 있습니다.

## job 실행

Docker runtime이 실행 중이어야 하고 act가 설치되어 있어야 합니다(macOS는 `brew install act`). runner 이미지는 `-P`로 `catthehacker/ubuntu:act-latest`를 지정합니다. 저장소 루트에서 아래 명령을 실행해, act가 `Job succeeded`를 출력하고 종료 코드 0으로 끝나면 통과입니다. 이미지를 받은 뒤에는 `pnpm-check`가 약 1분 30초, `package-smoke`가 약 1분 걸립니다.

```sh
act pull_request -j pnpm-check -P ubuntu-latest=catthehacker/ubuntu:act-latest --rm
act pull_request -j package-smoke -P ubuntu-latest=catthehacker/ubuntu:act-latest --rm
```

- `-j`는 event와 관계없이 모든 workflow에서 그 ID의 job을 찾아 실행합니다. 그래서 두 workflow는 같은 job ID를 쓰지 않습니다.
- workflow의 job ID나 파일 이름을 바꾸면 이 문서의 act 명령도 함께 고칩니다. `pnpm run check`의 unit test(`packages/app/scripts/actCommands.test.ts`)가 이 문서에 있는 act 명령의 `-j` job ID가 workflow 중 정확히 한 곳에 있는지, `-W` 경로에 파일이 있는지, 두 workflow에 같은 job ID가 없는지 검사합니다.
- Apple Silicon에서 act가 `--container-architecture linux/amd64`를 쓰라는 경고를 출력해도 이 옵션은 주지 않습니다. Docker Desktop의 containerd image store에서는 act가 amd64 이미지의 `PATH`를 읽지 못해, node로 실행하는 action이 `exec: "node": executable file not found in $PATH`로 실패합니다.

## windows-smoke

`check.yml`의 `windows-smoke` job은 `windows-latest` runner에서 실행되므로 act로 실행할 수 없습니다. 이 job을 고쳤으면 push한 뒤 PR의 GitHub Actions 실행 결과로 확인합니다. 이 job은 `package-smoke`가 artifact로 올린 tarball을 설치하는데, act에서는 `package-smoke`의 artifact 업로드 단계를 건너뛰므로 업로드도 PR 실행 결과로만 확인할 수 있습니다.

job이 실패하면 마지막 `Print the server log` 단계에 출력된 서버 로그에서 원인을 확인합니다.

## release.yml

게시 흐름은 `docs/release.md`에 있습니다. `workflow_run`은 default branch에 있는 `release.yml`로 실행되므로, PR에서 고친 `release.yml`은 main에 들어간 뒤부터 적용됩니다.

npm 인증은 trusted publishing(OIDC)으로 합니다. npmjs.com 패키지 Settings의 trusted publisher에 저장소 `seungyeop-lee/beads-desk`와 workflow 파일 이름 `release.yml`을 적으므로, 파일 이름을 바꾸면 그 설정도 함께 바꿉니다. 패키지의 Publishing access가 bypass 2FA token을 막고 있어서 token으로는 게시할 수 없습니다. trusted publisher를 다시 만들어야 하면 `docs/trusted-publisher.md`의 순서를 따릅니다.

### 수동 실행으로 확인

`release.yml`을 고쳤으면 수동 실행(`workflow_dispatch`)으로 확인합니다. 수동 실행은 `check.yml`의 결과를 기다리지 않고, `npm publish --dry-run`까지만 실행하고 tag와 Release를 만들지 않습니다. 입력 `package`와 `version`은 npm에서 찾을 대상과 `CHANGELOG.md`에서 읽을 version을 바꾸므로, 이미 있는 version(예: `package=react`, `version=19.0.0`)과 없는 version을 넣어 두 분기를 확인합니다. act로 실행할 때는 위 "job 실행"의 설명을 따르되, event는 반드시 `workflow_dispatch`로 줍니다. `workflow_run` event로 실행하면 dry-run이 아니라 실제 게시를 시도합니다.

dry-run은 입력과 관계없이 `packages/app/package.json`의 version을 게시합니다. 그래서 없는 version 분기는 `version` 입력만 바꾸면 publish job이 `You cannot publish over the previously published versions`로 실패하므로, 두 파일을 커밋하지 않고 잠시 바꿔서 확인합니다.

1. `packages/app/package.json`의 `version`을 npm에 없는 version(예: 지금 version의 다음 patch)으로 바꿉니다.
2. `CHANGELOG.md`에 같은 version의 절을 `## [<version>] - <YYYY-MM-DD>`로 추가합니다. 수동 실행은 `Unreleased`로 적어도 경고만 출력하지만, 실제 게시에서는 실패하므로 날짜를 적어 실제와 같은 조건으로 확인합니다.
3. 아래 첫 명령의 `version`에 같은 version을 넣어 실행합니다.
4. 실행이 끝나면 성공·실패와 관계없이 `git restore CHANGELOG.md packages/app/package.json`으로 두 파일을 원복합니다.

```sh
act workflow_dispatch -W .github/workflows/release.yml --input version=<1단계의 version> -P ubuntu-latest=catthehacker/ubuntu:act-latest --rm
act workflow_dispatch -W .github/workflows/release.yml --input package=react --input version=19.0.0 -P ubuntu-latest=catthehacker/ubuntu:act-latest --rm
```

없는 version은 `publish` job이 `npm notice ... (dry-run)`을 출력하고 `Job succeeded`로 끝나면 통과입니다(약 35초). 이미 있는 version은 `published on npm: true`를 출력한 뒤 `publish` job이 실행되지 않고 끝나면 통과입니다. act는 OIDC token을 발급하지 못하므로, trusted publishing 인증은 trusted publisher를 설정한 뒤 GitHub에서 게시할 때에만 확인할 수 있습니다.

prerelease 분기는 1–4단계의 version을 npm에 없는 prerelease version(예: `0.2.1-beta.1`)으로 바꿔 같은 순서로 확인합니다. `publish` job의 npm 로그가 prerelease에서는 `with tag next`를, 정식 version에서는 `with tag latest`를 출력하면 통과입니다.

### 게시 조건을 workflow_run event로 확인

check 결과로 게시 여부를 정하는 조건은 수동 실행으로 확인할 수 없습니다. 이 조건을 고쳤으면 `workflow_run` event의 payload를 파일로 만들어 act에 `-e`로 줍니다. `head_sha`에는 이미 게시한 version의 커밋 가운데 origin에 push한 커밋을 넣습니다. act는 이 커밋을 원격 저장소에서 받으므로 push하지 않은 커밋은 checkout에서 실패하고, 게시하지 않은 version의 커밋을 넣으면 실제 게시를 시도합니다.

```json
{
  "workflow_run": {
    "event": "push",
    "conclusion": "success",
    "head_sha": "<커밋>",
    "head_branch": "main"
  }
}
```

```sh
act workflow_run -W .github/workflows/release.yml -e <payload 파일> -P ubuntu-latest=catthehacker/ubuntu:act-latest --rm
```

위 payload로 실행하면 `version` job이 `HEAD is now at <커밋>`과 `published on npm: true`를 출력하고 `publish` job 없이 끝나야 통과입니다. `conclusion`을 `failure`로 바꾸거나 `event`를 `pull_request`로 바꾸면 job이 하나도 실행되지 않고 종료 코드 0으로 끝나야 통과입니다.

## pages.yml

main에 push한 커밋에서 `docs/beads-desk-intro.mp4`나 이 workflow가 바뀌면, 그 MP4를 GitHub Pages에 배포합니다. README 맨 위 GIF는 배포된 주소 `https://seungyeop-lee.github.io/beads-desk/beads-desk-intro.mp4`를 링크로 엽니다. 저장소 Settings의 Pages에서 Source가 "GitHub Actions"여야 배포됩니다. Pages를 켜기 전에 push해서 배포가 실패했으면, Pages를 켠 뒤 Actions 화면에서 이 workflow를 수동 실행(`workflow_dispatch`)합니다.

act로는 배포할 파일을 묶는 단계까지만 확인할 수 있습니다. 아래 명령에서 `Archive artifact` 단계가 `./beads-desk-intro.mp4`를 출력하면 통과입니다. 그 뒤의 `Upload artifact` 단계는 act 0.2.89의 artifact server가 `upload-artifact` v7의 요청을 받지 못해 `unknown field "mime_type"`으로 실패합니다([nektos/act#6022](https://github.com/nektos/act/issues/6022)). 그래서 업로드와 배포는 push한 뒤 GitHub Actions 실행 결과로 확인합니다.

```sh
act workflow_dispatch -W .github/workflows/pages.yml -j pages-artifact -P ubuntu-latest=catthehacker/ubuntu:act-latest --artifact-server-path /tmp/act-artifacts --rm
```
