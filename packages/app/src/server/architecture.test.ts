import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = resolve(SRC_DIR, "..");
const PACKAGES_DIR = resolve(APP_DIR, "..");

type Layer =
  | "app"
  | "client/ui"
  | "client/application"
  | "client/infra"
  | "client/domain"
  | "server/web"
  | "server/infra"
  | "server/application"
  | "server/domain"
  | "shared/contract"
  | "shared/domain";

type AllowedDependencies = Readonly<Partial<Record<Layer, true>>>;

const ALLOWED_DEPENDENCIES: Record<Layer, AllowedDependencies> = {
  app: {
    app: true,
    "client/ui": true,
    "server/web": true,
    "server/infra": true,
    "shared/contract": true,
    "shared/domain": true,
  },
  "client/ui": {
    "client/ui": true,
    "client/application": true,
    "client/infra": true,
    "client/domain": true,
    "server/web": true,
    "shared/contract": true,
    "shared/domain": true,
  },
  "client/application": {
    "client/application": true,
    "client/infra": true,
    "client/domain": true,
    "server/web": true,
    "shared/contract": true,
    "shared/domain": true,
  },
  "client/infra": {
    "client/infra": true,
    "client/domain": true,
    "server/web": true,
    "shared/contract": true,
    "shared/domain": true,
  },
  "client/domain": {
    "client/domain": true,
    "shared/contract": true,
    "shared/domain": true,
  },
  "server/web": {
    "server/web": true,
    "server/application": true,
    "server/infra": true,
    "server/domain": true,
    "shared/contract": true,
    "shared/domain": true,
  },
  "server/infra": {
    "server/infra": true,
    "server/application": true,
    "server/domain": true,
    "shared/contract": true,
    "shared/domain": true,
  },
  "server/application": {
    "server/application": true,
    "server/domain": true,
    "shared/contract": true,
    "shared/domain": true,
  },
  "server/domain": {
    "server/domain": true,
    "shared/contract": true,
    "shared/domain": true,
  },
  "shared/contract": {
    "shared/contract": true,
    "shared/domain": true,
  },
  "shared/domain": {
    "shared/domain": true,
  },
};

/** Next.js가 정해진 위치에서 찾는 server entrypoint 파일입니다. app layer로 취급합니다. */
const FRAMEWORK_ENTRYPOINTS = ["instrumentation.ts", "proxy.ts"];

/**
 * src 밖에서 import할 수 있는 파일입니다. launcher(`bin`)는 서버 bundle을 불러올 수 없어서,
 * launcher와 서버가 같은 규칙을 써야 하는 코드는 `bin`에 plain JS로 두고 server infra가 import합니다.
 */
const LAUNCHER_MODULES: Readonly<Record<string, Layer>> = {
  "bin/workspaceRoot.js": "server/infra",
};

test("production import는 안쪽 layer만 가리킨다", () => {
  expect(describeBoundaryViolation()).toBeNull();
});

test("runtime root에는 adapter layer와 modules만 둔다", () => {
  expect(unexpectedRootEntries()).toEqual([]);
});

test("module root에는 application과 domain만 둔다", () => {
  expect(unexpectedModuleEntries()).toEqual([]);
});

test("module core에는 adapter와 UI artifact를 두지 않는다", () => {
  expect(misplacedModuleCoreEntries()).toEqual([]);
});

test("adapter layer 아래에 다른 layer 이름을 다시 두지 않는다", () => {
  expect(nestedAdapterLayerEntries()).toEqual([]);
});

test("app과 bd package의 src에는 역할 이름으로 묶은 디렉터리를 두지 않는다", () => {
  expect([SRC_DIR, join(PACKAGES_DIR, "bd/src")].flatMap(roleNamedDirectoriesIn)).toEqual([]);
});

function describeBoundaryViolation(): string | null {
  for (const file of sourceFilesIn(SRC_DIR)) {
    const fromPath = sourcePath(file);
    const from = layerOf(fromPath);
    if (!from) return `layer 밖에 production module이 있습니다: ${fromPath}`;

    for (const { specifier, line } of importsOf(file)) {
      const outsidePath = outsideSrcTargetPath(specifier, file);
      if (outsidePath) {
        if (outsidePath.startsWith("..")) {
          return `${fromPath}:${line}이 app package 밖 module을 상대 경로로 import합니다. 다른 package는 package 이름으로 import합니다: ${specifier}`;
        }
        if (LAUNCHER_MODULES[outsidePath] === from) continue;
        return `${fromPath}:${line}이 허용하지 않은 src 밖 module을 import합니다: ${specifier}`;
      }
      const targetPath = internalTargetPath(specifier, file);
      if (!targetPath) continue;
      const to = layerOf(targetPath);
      if (!to) return `${fromPath}:${line}이 layer 밖 module을 import합니다: ${specifier}`;
      if (fromPath.startsWith("app/(client)/") && to === "server/infra") {
        return `${fromPath}:${line}의 client entrypoint는 server infra를 직접 import할 수 없습니다: ${specifier}`;
      }
      if (!ALLOWED_DEPENDENCIES[from][to]) {
        return `${fromPath}:${line}의 ${from} → ${to} 의존은 허용되지 않습니다: ${specifier}`;
      }
    }
  }
  return null;
}

function unexpectedRootEntries(): string[] {
  return [
    ...entriesOutside("client", { ui: true, modules: true, infra: true }),
    ...entriesOutside("server", { web: true, modules: true, infra: true }),
    ...entriesOutside("shared", { contract: true, domain: true }),
  ];
}

function unexpectedModuleEntries(): string[] {
  return ["client", "server"].flatMap((runtime) => {
    const modulesRoot = `${runtime}/modules`;
    return directoryEntries(modulesRoot).flatMap((module) => {
      const moduleRoot = `${modulesRoot}/${module.name}`;
      if (!module.isDirectory()) return [moduleRoot];
      return entriesOutside(moduleRoot, { application: true, domain: true });
    });
  });
}

function misplacedModuleCoreEntries(): string[] {
  const misplacedDirectory =
    /\/modules\/[^/]+\/(?:application|domain)\/(?:[^/]+\/)*(?:ui|web|infra|shared)(?:\/|$)/;
  const uiArtifact =
    /\/modules\/[^/]+\/(?:application|domain)\/.*(?:Screen|Modal|Pane)[^/]*\.[cm]?[jt]sx?$/;
  return ["client", "server"]
    .flatMap((runtime) => entryPathsIn(`${runtime}/modules`))
    .filter(
      (path) => path.endsWith(".css") || misplacedDirectory.test(path) || uiArtifact.test(path),
    );
}

function nestedAdapterLayerEntries(): string[] {
  const nestedLayer =
    /^(?:client\/(?:ui|infra)|server\/(?:web|infra))\/(?:application|domain|ui|web|infra|shared)(?:\/|$)/;
  return ["client/ui", "client/infra", "server/web", "server/infra"]
    .flatMap(entryPathsIn)
    .filter((path) => nestedLayer.test(path));
}

const ROLE_DIRECTORY_NAMES = new Set(["utils", "util", "helpers", "helper", "common", "misc"]);

function roleNamedDirectoriesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isDirectory() && ROLE_DIRECTORY_NAMES.has(entry.name))
    .map((entry) =>
      relative(PACKAGES_DIR, join(entry.parentPath, entry.name)).split(sep).join("/"),
    );
}

function entryPathsIn(root: string): string[] {
  return directoryEntries(root).flatMap((entry) => {
    const path = `${root}/${entry.name}`;
    return entry.isDirectory() ? [path, ...entryPathsIn(path)] : [path];
  });
}

function entriesOutside(root: string, allowed: Readonly<Partial<Record<string, true>>>): string[] {
  return directoryEntries(root).flatMap((entry) => {
    if (allowed[entry.name]) return [];
    if (root === "server" && entry.name === "architecture.test.ts") return [];
    return [`${root}/${entry.name}`];
  });
}

// 아직 코드가 없는 layer 디렉터리는 만들지 않으므로 없는 디렉터리는 빈 디렉터리로 봅니다.
function directoryEntries(root: string) {
  const dir = join(SRC_DIR, root);
  return existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : [];
}

function sourceFilesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFilesIn(full);
    if (!/\.(?:ts|tsx)$/.test(entry.name) || /\.(?:test|testkit)\.(?:ts|tsx)$/.test(entry.name))
      return [];
    return [full];
  });
}

const IMPORT_PATTERN = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

function importsOf(file: string): { specifier: string; line: number }[] {
  const content = readFileSync(file, "utf8");
  return [...content.matchAll(IMPORT_PATTERN)].map((match) => ({
    specifier: match[1]!,
    line: content.slice(0, match.index).split("\n").length,
  }));
}

function internalTargetPath(specifier: string, fromFile: string): string | null {
  if (specifier.startsWith("@/")) return specifier.slice(2);
  if (!specifier.startsWith(".")) return null;
  const target = relative(SRC_DIR, resolve(dirname(fromFile), specifier));
  if (target.startsWith("..")) return null;
  return target.split(sep).join("/");
}

/**
 * src 밖을 가리키는 상대 경로 import의 대상을 app package 기준 경로로 돌려줍니다.
 * 대상이 app package 밖이면 돌려준 경로가 `..`로 시작합니다.
 */
function outsideSrcTargetPath(specifier: string, fromFile: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const target = resolve(dirname(fromFile), specifier);
  if (!relative(SRC_DIR, target).startsWith("..")) return null;
  return relative(APP_DIR, target).split(sep).join("/");
}

function sourcePath(file: string): string {
  return relative(SRC_DIR, file).split(sep).join("/");
}

function layerOf(path: string): Layer | null {
  if (path === "app" || path.startsWith("app/")) return "app";
  if (FRAMEWORK_ENTRYPOINTS.includes(path)) return "app";

  const moduleLayer = path.match(/^(client|server)\/modules\/[^/]+\/(application|domain)(?:\/|$)/);
  if (moduleLayer) return `${moduleLayer[1]}/${moduleLayer[2]}` as Layer;

  for (const layer of [
    "client/ui",
    "client/infra",
    "server/web",
    "server/infra",
    "shared/contract",
    "shared/domain",
  ] satisfies Layer[]) {
    if (path === layer || path.startsWith(`${layer}/`)) return layer;
  }
  return null;
}
