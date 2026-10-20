# playground: 수동 테스트 환경

화면을 직접 조작해 보거나 버그를 재현할 때 쓰는 명령입니다. 테스트 데이터를 담은 bd workspace와 빈 workspace를 만들고, 데이터 workspace를 연 `next dev`를 띄웁니다.

## 실행

저장소 루트에서 실행합니다.

```sh
pnpm playground [상위 디렉터리] [--keep]
```

- 상위 디렉터리를 생략하면 OS 임시 디렉터리 아래 `beads-desk-playground`를 씁니다. 그 아래에 데이터 workspace `acme-web`과 빈 workspace `empty-project`를 만듭니다.
- 실행할 때마다 두 workspace를 지우고 처음 상태로 다시 만듭니다. 화면에서 gate에 응답하거나 카드를 옮겨 데이터가 바뀌었으면 다시 실행해 되돌립니다.
- `--keep`을 주면 두 workspace가 이미 있을 때 다시 만들지 않습니다. `packages/bd`를 고쳐 서버만 다시 시작해야 할 때처럼, 재현해 둔 상태를 유지하려면 이 옵션을 줍니다.
- 지울 workspace 디렉터리는 seed가 남긴 표시 파일(`.beads-desk-promo-seed`)로 확인합니다. 비어 있지 않은데 표시 파일이 없는 디렉터리는 지우지 않고 멈춥니다.
- 출력된 `Local:` URL로 화면을 엽니다. 포트는 실행할 때마다 빈 포트를 고릅니다. Ctrl-C로 끝냅니다.
- 빈 workspace는 서버에 등록되지 않은 채로 시작합니다. 화면의 workspace 메뉴에서 출력된 경로를 등록하면 workspace 전환과 빈 상태를 확인할 수 있습니다.

`next dev`는 `packages/app`에 하나만 띄울 수 있습니다. `pnpm dev`나 다른 playground가 떠 있으면 Next.js가 `Another next dev server is already running`과 기존 서버의 URL을 출력하고 끝납니다. 이때 seed는 이미 끝났으므로, 기존 서버를 끝내고 `--keep`으로 다시 실행합니다.

## 실행 환경

seed는 acme 데이터의 첨부 파일을 Playwright의 chromium으로 만듭니다. chromium이 없어 실패하면 저장소 루트에서 `pnpm run test:e2e:install`을 한 번 실행합니다.

서버와 seed가 실행하는 bd는 실행한 사람의 bd 설정을 읽지 않습니다. HOME을 `<상위 디렉터리>/.home`으로 바꾸고 `BD_*`, `BEADS_*` 환경 변수를 뺍니다(`packages/promo/src/seed/isolatedBdEnv.ts`). 그래서 셸에 export한 `BD_BIN`과 `BEADS_DESK_LOCAL_FILE_ROOTS`도 적용되지 않습니다.

## 테스트 데이터

데이터는 promo의 acme 데모 데이터(`packages/promo/src/seed/acmeProject.ts`)에 `src/edgeCases.ts`의 경계 사례를 더한 것입니다. acme 데이터를 바꾸면 이 환경의 데이터도 함께 바뀝니다. 시각은 실행한 시각 기준의 상대값이라, 언제 실행해도 Now의 최근 7일 통계와 보드의 오늘 닫힌 이슈가 비지 않습니다.

`src/edgeCases.ts`에 들어 있는 경계 사례는 아래와 같습니다.

| 확인할 것                                                                                            | 이슈                                                       |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 여덟 단계 epic plan, 나란히 진행하는 단계, epic 밖의 blocker, 안쪽 epic, 순서 없는 child, timer gate | `acme-r9d` (`/graph?epic=acme-r9d`)                        |
| child가 없는 epic, child가 모두 닫혀 닫을 수 있는 epic, 오래전에 닫힌 epic                           | `acme-n0c`, `acme-d1n`, `acme-c0d`                         |
| 의존 없이 blocked, bd 기본 목록 밖의 상태(pinned), human 라벨과 blocked·deferred가 겹친 이슈         | `acme-s1b`, `acme-s2p`, `acme-s3h`, `acme-s4d`             |
| 진행 중인데 막힌 이슈, 기한 없이 미룬 이슈, 담당자 없는 진행 중 이슈, 착수하지 않고 닫은 이슈        | `acme-s5i`, `acme-s6u`, `acme-s7a`, `acme-s8c`             |
| 닫으면 다섯 이슈가 풀리는 이슈(해제 안내의 "외 N개")                                                 | `acme-f4n`                                                 |
| Hygiene의 오래 방치된 이슈, 중복 후보, commit에 언급된 열린 이슈                                     | `acme-o3l`, `acme-u1p`·`acme-u2p`, `acme-o4l`              |
| 긴 제목, 끊을 곳 없는 긴 낱말, 한국어 본문과 댓글, 라벨이 많은 이슈, 제목만 있는 이슈                | `acme-l1t`, `acme-l2t`, `acme-k1r`, `acme-k2r`, `acme-e0b` |
| Markdown(mermaid, 표, 코드, 로컬 파일 그림과 403·404 링크), design·notes, 댓글 여섯 개               | `acme-m8d`                                                 |
| 세 단계 supersede 사슬, 작업 이슈로 대체된 결정, 진행 중으로 바꾼 결정                               | `acme-dc1`–`acme-dc3`, `acme-dc4`, `acme-dc6`              |
| 이전 회차가 둘인 gate, 이슈 둘을 막는 gate, 막는 열린 이슈가 없는 gate                               | `acme-h1g`, `acme-h2g`·`acme-h3g`, `acme-h4g`를 막던 gate  |
| 활동 탭의 여러 기록(우선순위, 라벨, 의존, 본문, 미룸 변경)                                           | 제목이 "Show usage limits on the billing page"인 이슈      |

bd가 만들지 못해 이 데이터에 없는 상태가 있습니다. bd는 blocks 순환을 `bd dep add`와 `bd import` 모두에서 거부하므로 Graph의 순환 경고는 재현할 수 없고, 사용자 정의 type도 `invalid issue type`으로 거부합니다.

새 화면 상태를 확인할 데이터가 필요하면 `src/edgeCases.ts`에 더합니다. import로 넣을 수 있는 이슈는 `edgeCaseIssues`에, gate·supersede·상태 변경·활동 기록처럼 bd 명령이 만드는 것은 `addEdgeCaseActivity`에 넣습니다. ID는 acme 데이터와 겹치지 않게 정하고, `src/edgeCases.test.ts`가 ID 중복, 없는 이슈를 가리키는 관계, 시각 순서를 검사합니다. bd가 받아들이는지는 `pnpm playground`를 실행해 확인합니다.
