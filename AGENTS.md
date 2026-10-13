# Agents

## 프로젝트 개요

`bd`(Beads) CLI를 사용하는 로컬 웹 UI입니다. 서버가 `bd`를 `child_process.spawn`으로 실행하고, 그 출력을 화면에 보여 줍니다.

`bd`는 이 프로젝트가 수정할 수 없는 외부 의존성입니다. `bd`의 출력이나 명령 형식이 부족하면 서버 쪽 adapter에서 보완하거나 그 한계를 받아들입니다. upstream 변경을 전제로 설계하지 않습니다.

## 작성 언어

문서, 코드 주석, 커밋 메시지는 한국어로 씁니다. 식별자, 라이브러리 이름, 명령어는 원문을 유지합니다. 커밋 메시지는 Conventional Commits 형식(`type(scope): 제목`)을 따릅니다.

## 검증

`pnpm run check`가 typecheck, lint, format 검사, unit test를 차례로 실행합니다. lefthook이 pre-commit에서 staged 파일의 format과 lint를, pre-push에서 `pnpm run check`를 실행합니다. hook은 `pnpm install` 때 설치됩니다.
