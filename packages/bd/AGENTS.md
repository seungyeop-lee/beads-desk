# packages/bd 검증

## 구성

- `src/issue.ts`: 이슈 model type과 bd JSON 파서, bd가 정한 개념의 판정. public `./issue` entry입니다.
- `src/issueQueries.ts`, `src/gateQueries.ts`, `src/hygieneQueries.ts`, `src/bdVersion.ts`, `src/changeFingerprint.ts`: 조회 대상별 읽기. 읽기를 더할 때는 대상에 맞는 파일에 넣습니다.
- `src/issueList.ts`: 목록을 읽는 bd 명령의 인자 조립과 이슈 목록 해석. `src/bdJson.ts`: bd JSON 출력에서 값을 꺼내는 공통 규칙. 둘 다 public entry로 내보내지 않습니다.
- `src/mutations.ts`: 쓰기 명령. `src/runBd.ts`: bd 실행 큐와 오류 해석. `src/bdBin.ts`: 실행 파일 찾기.

이 패키지의 unit test는 저장해 둔 bd 출력으로 해석을 확인하므로, 설치된 bd의 출력 형식이 바뀌어도 통과합니다. bd를 업데이트했거나 이 패키지의 출력 해석을 고쳤다면 저장소 루트에서 `pnpm run test:bd`를 실행합니다. 이 명령은 임시 디렉터리에 bd workspace를 만들고 설치된 bd로 adapter를 실행합니다(`src/realBd`, 약 15초). bd가 설치되어 있어야 하며, `pnpm run check`와 hook에서는 실행되지 않습니다.

`next dev`가 실행 중일 때 이 패키지를 고치면, 서버를 다시 시작하기 전까지 API가 고치기 전의 코드로 bd를 실행합니다. 고친 뒤 화면이나 API로 확인하려면 `next dev`를 다시 시작합니다.
