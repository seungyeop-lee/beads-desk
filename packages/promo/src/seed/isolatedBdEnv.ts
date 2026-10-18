import { join } from "node:path";

/**
 * 데모 workspace에서 bd를 실행할 환경 변수입니다. seed와 capture가 실행하는 bd, capture가 띄우는 서버가 함께 씁니다.
 *
 * bd는 사용자 단위 설정 파일(`~/.config/bd/config.yaml` 등)과 BD_*, BEADS_* 환경 변수를 읽습니다.
 * 실행한 사람의 설정이 섞이면 쓰기를 거부하거나, BEADS_DIR처럼 DB 위치를 정하는 변수 때문에 이 디렉터리가 아닌 다른 DB에 쓸 수 있습니다.
 * 그래서 빈 HOME을 주고 BD_*, BEADS_* 환경 변수를 뺍니다.
 * git 작성자와 bd actor도 정해 두어, 실행한 사람의 이름이 데모 데이터에 남지 않게 합니다.
 */
export function isolatedBdEnv(home: string): NodeJS.ProcessEnv {
  const inherited = Object.entries(process.env).filter(
    ([name]) => !name.startsWith("BD_") && !name.startsWith("BEADS_"),
  );
  return {
    ...Object.fromEntries(inherited),
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    DO_NOT_TRACK: "1",
    BEADS_ACTOR: "sam",
    GIT_AUTHOR_NAME: "Acme Team",
    GIT_AUTHOR_EMAIL: "team@acme.example",
    GIT_COMMITTER_NAME: "Acme Team",
    GIT_COMMITTER_EMAIL: "team@acme.example",
  };
}
