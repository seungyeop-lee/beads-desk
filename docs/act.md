# act 실행 특성과 GitHub runner와 다른 점

act로 실행할 명령과 통과 기준은 `.github/AGENTS.md`에 있습니다.

## 실행 동작

- act는 commit하지 않은 변경까지 포함해 작업 트리를 container에 복사합니다. `.gitignore`에 있는 파일(`node_modules` 등)은 복사하지 않습니다.
- `--rm`을 빼면 job이 실패했을 때 이름이 `act-`로 시작하는 container와 volume이 남습니다.

## GitHub runner와 다른 점

act의 결과는 GitHub-hosted runner(x64 `ubuntu-latest`)의 결과와 다음 점에서 달라질 수 있습니다.

- runner 이미지가 달라 미리 설치된 패키지와 apt 저장소가 다릅니다. `playwright install --with-deps`처럼 apt로 설치하는 단계는 act에서 통과해도 GitHub에서 실패할 수 있고, 반대의 경우도 생깁니다.
- Apple Silicon에서는 arm64 container에서 실행하므로, pnpm이 GitHub runner와 다른 플랫폼의 native 패키지를 설치합니다.
- cache는 act에 내장된 cache server가 `~/.cache/actcache`에 저장합니다. 두 번째 실행부터 setup-node의 pnpm cache가 복원되지만, GitHub의 cache와는 공유되지 않습니다.
- act에서는 OIDC token을 발급받을 수 없으므로, `id-token: write` 권한이 필요한 단계는 act로 확인할 수 없습니다.
