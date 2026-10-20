import { resolve } from "node:path";
import { ACME_PREFIX, acmeIssues, addCliActivity } from "./acmeProject.ts";
import { seedWorkspace } from "./seedWorkspace.ts";

const target = process.argv[2];
if (!target) {
  console.error("사용법: pnpm --filter promo run seed <디렉터리>");
  process.exit(1);
}
// pnpm은 package 디렉터리에서 script를 실행하므로, 상대 경로는 명령을 입력한 디렉터리(INIT_CWD) 기준으로 풉니다.
const workspace = resolve(process.env.INIT_CWD ?? process.cwd(), target);

try {
  seedWorkspace(workspace, {
    prefix: ACME_PREFIX,
    issues: acmeIssues(Date.now(), workspace),
    addActivity: (bd, git) => addCliActivity(bd, git, workspace),
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
console.log(`${workspace}에 데모 workspace를 만들었습니다.`);
