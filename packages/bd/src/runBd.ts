import { spawn } from "node:child_process";

export type BdResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type RunBdOptions = {
  cwd: string;
};

/** 실행 파일을 찾지 못했을 때 셸과 같은 종료 코드를 돌려줍니다. */
const SPAWN_FAILURE_CODE = 127;

export function runBd(args: string[], options: RunBdOptions): Promise<BdResult> {
  return new Promise((resolve) => {
    const child = spawn(bdBin(), args, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => stdout.push(chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => stderr.push(chunk));

    child.on("error", () => resolve({ code: SPAWN_FAILURE_CODE, stdout: "", stderr: "" }));
    child.on("close", (code) =>
      resolve({ code: code ?? 0, stdout: stdout.join(""), stderr: stderr.join("") }),
    );
  });
}

function bdBin(): string {
  return process.env.BD_BIN || "bd";
}
