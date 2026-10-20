import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { ACME_PREFIX, acmeIssues, addCliActivity } from "@beads-desk/promo/seed/acmeProject";
import { isolatedBdEnv } from "@beads-desk/promo/seed/isolatedBdEnv";
import { seedWorkspace } from "@beads-desk/promo/seed/seedWorkspace";
import { addEdgeCaseActivity, edgeCaseIssues } from "./edgeCases.ts";

const APP_DIR = fileURLToPath(new URL("../../app/", import.meta.url));

const { values, positionals } = parseArgs({
  options: { keep: { type: "boolean", default: false } },
  allowPositionals: true,
});
// pnpm은 package 디렉터리에서 script를 실행하므로, 상대 경로는 명령을 입력한 디렉터리(INIT_CWD) 기준으로 풉니다.
const parent = resolve(
  process.env.INIT_CWD ?? process.cwd(),
  positionals[0] ?? join(tmpdir(), "beads-desk-playground"),
);
const dataWorkspace = join(parent, "acme-web");
const emptyWorkspace = join(parent, "empty-project");

try {
  if (values.keep && existsSync(dataWorkspace) && existsSync(emptyWorkspace)) {
    console.log("--keep: 이미 만든 workspace를 그대로 씁니다.");
  } else {
    const now = Date.now();
    seedWorkspace(dataWorkspace, {
      prefix: ACME_PREFIX,
      issues: [...acmeIssues(now, dataWorkspace), ...edgeCaseIssues(now, dataWorkspace)],
      addActivity: (bd, git) => {
        addCliActivity(bd, git, dataWorkspace);
        addEdgeCaseActivity(bd, git, dataWorkspace);
      },
    });
    seedWorkspace(emptyWorkspace, { prefix: "empty", issues: [] });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
console.log(`데이터 workspace: ${dataWorkspace}`);
console.log(`빈 workspace: ${emptyWorkspace} (화면의 workspace 메뉴에서 이 경로를 등록합니다)`);

const port = await freePort();
// 서버가 실행하는 bd도 seed와 같은 격리 환경에서 실행되도록, BD_*, BEADS_*를 뺀 환경 변수와 실행한 사람의 설정이 없는 HOME을 줍니다.
// 셸에 export한 앱 설정(`BEADS_DESK_LOCAL_FILE_ROOTS` 등)도 BEADS_* 접두사로 함께 빠집니다.
// next dev는 끝날 때 HOME에 설정 파일을 남기므로, HOME은 지우지 않고 실행할 때마다 다시 씁니다.
const server = spawn(
  join(APP_DIR, "node_modules/.bin/next"),
  ["dev", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: APP_DIR,
    env: {
      ...isolatedBdEnv(join(parent, ".home")),
      NEXT_TELEMETRY_DISABLED: "1",
      BEADS_DESK_WORKSPACE: dataWorkspace,
    },
    stdio: "inherit",
    // next dev는 next-server를 따로 띄우므로, 이 명령이 어떤 signal로 끝나든 둘이 함께 끝나도록 process group을 따로 두고 group 전체에 전달합니다.
    detached: true,
  },
);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => process.kill(-server.pid!, signal));
}
const [code] = await once(server, "exit");
process.exit(code ?? 0);

/** 운영체제가 고른 빈 포트입니다. 평소 쓰는 bd-desk(3000번부터)나 e2e 서버(3900번부터)와 겹치지 않습니다. */
async function freePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  probe.close();
  if (address === null || typeof address === "string")
    throw new Error("빈 포트를 찾지 못했습니다.");
  return address.port;
}
