import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("npm 명령(pack 또는 publish)을 지정해 주세요.");
  process.exit(1);
}

const stageRoot = await mkdtemp(join(tmpdir(), "beads-desk-npm-"));

try {
  await stagePackage();
  const code = await runNpm([command, stageRoot, ...args, "--ignore-scripts"]);
  process.exitCode = code;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await rm(stageRoot, { force: true, recursive: true });
}

async function stagePackage() {
  const packageJson = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));

  for (const path of packageJson.files) {
    await cp(resolve(packageRoot, path), resolve(stageRoot, path), {
      recursive: true,
      preserveTimestamps: true,
    });
  }

  // npm 패키지 페이지에 보이도록 저장소 루트의 README를 함께 넣습니다.
  await cp(resolve(packageRoot, "..", "..", "README.md"), resolve(stageRoot, "README.md"));

  // 내부 workspace 패키지는 빌드 때 server bundle에 포함됩니다.
  // `workspace:*` 명세는 npm이 해석하지 못하므로 devDependencies와 scripts를 빼고 게시합니다.
  delete packageJson.devDependencies;
  delete packageJson.scripts;
  await writeFile(resolve(stageRoot, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
}

function runNpm(npmArgs) {
  return new Promise((resolveCode) => {
    const child = spawn(npmCommand, npmArgs, {
      cwd: process.cwd(),
      env: withoutPackageManagerConfig(process.env),
      stdio: "inherit",
    });
    child.on("exit", (code) => resolveCode(code ?? 1));
  });
}

// pnpm으로 실행하면 npm_config_* 값이 npm에 그대로 전달되어 pack·publish 동작이 바뀝니다.
function withoutPackageManagerConfig(env) {
  return Object.fromEntries(
    Object.entries(env).filter(([name]) => {
      const lower = name.toLowerCase();
      return !lower.startsWith("npm_config_") && !lower.startsWith("pnpm_config_");
    }),
  );
}
