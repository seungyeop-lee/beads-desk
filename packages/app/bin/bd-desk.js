#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDaemon } from "./daemon.js";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

const USAGE = `Usage: bd-desk [start|stop|restart] [--port <number>] [--open]

  start    Start the server in the background. This is the default command.
           If the server is already running, add the current directory
           as a workspace. Either way, print the URL of this workspace.
  stop     Stop the running server.
  restart  Restart on the same port, keeping the added workspaces
           and their URLs.

  --port <number>  Server port. Defaults to the first free port from ${DEFAULT_PORT}.
  --open           Open the browser when the server is ready.
  -v, --version    Print the installed bd-desk version.
  -h, --help       Print this usage.`;

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
if (args.includes("--version") || args.includes("-v")) {
  console.log(require("../package.json").version);
  process.exit(0);
}
const options = parseArguments(args);
if (!options) {
  console.error(USAGE);
  process.exit(1);
}
if (!existsSync(resolve(packageRoot, ".next", "BUILD_ID"))) {
  console.error("Build output not found. Reinstall the package.");
  process.exit(1);
}

const daemon = createDaemon({
  // 사용자별 runtime 디렉터리에 상태 파일과 로그를 둡니다.
  runtimeDir: join(process.env.XDG_RUNTIME_DIR || tmpdir(), "beads-desk"),
  defaultPort: DEFAULT_PORT,
  openBrowser,
  // next start는 패키지 루트에서 실행해야 하므로, workspace 디렉터리는 환경 변수로 넘깁니다.
  serverCommand: (port, workspaceRoot) => ({
    command: process.execPath,
    args: [
      require.resolve("next/dist/bin/next"),
      "start",
      packageRoot,
      "--port",
      String(port),
      "--hostname",
      HOST,
    ],
    cwd: packageRoot,
    env: {
      ...process.env,
      BEADS_DESK_WORKSPACE: workspaceRoot,
      HOSTNAME: HOST,
      PORT: String(port),
    },
  }),
});

try {
  process.exitCode =
    options.command === "start"
      ? await daemon.start({ cwd: process.cwd(), port: options.port, open: options.open })
      : options.command === "stop"
        ? await daemon.stop()
        : await daemon.restart({ cwd: process.cwd(), port: options.port, open: options.open });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseArguments(args) {
  const parsed = { command: "start", port: undefined, open: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (index === 0 && ["start", "stop", "restart"].includes(arg)) parsed.command = arg;
    else if (arg === "--open") parsed.open = true;
    else if (arg === "--port") {
      parsed.port = Number(args[++index]);
      if (!Number.isInteger(parsed.port) || parsed.port <= 0 || parsed.port > 65_535) return null;
    } else return null;
  }
  return parsed;
}

function openBrowser(url) {
  const [command, commandArgs] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  spawn(command, commandArgs, { detached: true, stdio: "ignore" })
    // 브라우저를 여는 명령이 없는 환경(예: xdg-open이 없는 Linux)에서도 서버는 이미 떠 있으므로 실패로 끝내지 않습니다.
    .on("error", () => console.log("Could not open the browser. Open the URL above manually."))
    .unref();
}
