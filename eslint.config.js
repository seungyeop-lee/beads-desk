import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// 화면 route(`app/(client)`)의 Server Component가 import할 수 있는 `server` 하위 파일입니다.
// 루트 AGENTS.md는 파일 이름을 적지 않고 이 목록을 가리키므로, 허용 목록은 여기에만 둡니다.
const clientRouteServerFiles = [
  "web/locale/requestLocale",
  "web/theme/requestTheme",
  "web/workspaces/registeredWorkspaces",
  "infra/runtime/serverRuntime",
];
const clientRouteServerAllowed = `(?:${clientRouteServerFiles.join("|")})$`;

// 문서로만 적어 두면 낡는 경계를 여기서 강제합니다.
// 각 패턴은 `@/` alias와 상대 경로 양쪽을 모두 막습니다.
const boundaries = {
  bdPackage: {
    regex:
      "^@/|^@seungyeop-lee/beads-desk(?:/|$)|^(?:\\.\\./)+app(?:/|$)|^next(?:/|$)|^react(?:/|$)",
    message: "bd package는 app, Next.js, React에 의존하지 않습니다.",
  },
  promoPackage: {
    // e2e helper를 import하면 테스트를 고칠 때 소개 자료가 함께 깨지므로, 필요한 bd 실행은 promo 안에 둡니다.
    regex: "^@/|^@seungyeop-lee/beads-desk(?:/|$)|^(?:\\.\\./)+app(?:/|$)",
    message: "promo package는 app의 코드와 테스트 helper에 의존하지 않습니다.",
  },
  playgroundPackage: {
    // app은 next dev process로 띄우므로 코드를 import할 일이 없고, e2e helper를 import하면 테스트를 고칠 때 수동 테스트 환경이 함께 깨집니다.
    regex: "^@/|^@seungyeop-lee/beads-desk(?:/|$)|^(?:\\.\\./)+app(?:/|$)",
    message: "playground package는 app의 코드와 테스트 helper에 의존하지 않습니다.",
  },
  bdServerPackage: {
    regex: "^@beads-desk/bd(?:$|/(?!(?:issue|types)$))",
    message:
      "Client, shared, 화면 route(`app/(client)`), route group 밖의 app 파일은 bd 실행 구현 대신 이슈 model(`@beads-desk/bd/issue`)과 type entry(`@beads-desk/bd/types`)만 사용합니다.",
  },
  clientRouteServerSurface: {
    regex: `^@/server/(?!${clientRouteServerAllowed})|^(?:\\.\\./)+server/(?!${clientRouteServerAllowed})`,
    message: `화면 route(\`app/(client)\`)는 \`server\`의 ${clientRouteServerFiles.map((file) => `\`${file}\``).join(", ")} 파일만 import합니다.`,
  },
  serverFromAppRoot: {
    regex: "^@/server(?:/|$)|^(?:\\.\\./)+server(?:/|$)",
    message: "route group 밖의 app 파일(`icon.ts` 등)은 server를 import하지 않습니다.",
  },
  serverRouteSurface: {
    regex:
      "^@/server/(?!web/[^/]+/[^/]*RouteApi$)|^(?:\\.\\./)+server/(?!web/[^/]+/[^/]*RouteApi$)|^@beads-desk/bd(?:/|$)",
    message:
      "Route handler는 `server/web`의 `*RouteApi.ts`만 import하고, bd 실행과 이슈 model은 RouteApi에서 다룹니다.",
  },
  parentFileImport: {
    regex: "^(?:\\.\\./)+[^/]*$",
    message:
      "하위 디렉터리는 상위 디렉터리의 파일을 직접 지목하지 않습니다. 함께 쓰는 선언은 안쪽 layer나 shared 소유 경계로 옮깁니다.",
  },
  clientFromServer: {
    regex: "^@/client(?:/|$)|^(?:\\.\\./)+client(?:/|$)",
    message: "server는 client를 import하지 않습니다.",
  },
  serverOuterFromApplication: {
    regex: "^@/server/(?:web|infra)(?:/|$)|^(?:\\.\\./)+(?:web|infra)(?:/|$)",
    message: "server application은 web과 infra 구현에 의존하지 않습니다.",
  },
  serverTechnologyFromApplication: {
    // @beads-desk/bd는 외부 기술이 아니라 이 저장소의 bd CLI adapter이므로 application이 직접 씁니다.
    regex: "^node:|^next(?:/|$)",
    message:
      "server application은 runtime 구현과 기술 package 대신 자신이 선언한 port에 의존합니다.",
  },
  serverOuterFromDomain: {
    regex:
      "^@/server/(?:web|infra|modules/[^/]+/application)(?:/|$)|^(?:\\.\\./)+(?:web|infra|application|[^/]+/application)(?:/|$)",
    message: "server domain은 application과 바깥 adapter layer에 의존하지 않습니다.",
  },
  serverTechnologyFromDomain: {
    // `@beads-desk/bd/issue`와 `/types`는 bd CLI adapter가 아니라 값 없는 이슈 model이므로 domain도 씁니다.
    regex: "^node:|^next(?:/|$)|^@beads-desk/bd(?:$|/(?!(?:issue|types)$))",
    message: "server domain은 runtime 구현과 외부 기술 package에 의존하지 않습니다.",
  },
  serverFromClient: {
    regex: "^@/server/(?!web/.+Actions?$)|^(?:\\.\\./)+server/(?!web/.+Actions?$)",
    message:
      "Client는 `server/web`의 Server Action(`*Action.ts`, `*Actions.ts`)만 import합니다. 경계 타입은 `shared/contract`에서 가져옵니다.",
  },
  sharedIsolation: {
    regex: "^@/(?:app|client|server)(?:/|$)|^(?:\\.\\./)+(?:app|client|server)(?:/|$)",
    message: "shared는 app, client, server runtime에 의존하지 않습니다.",
  },
  sharedContractFromDomain: {
    regex: "^@/shared/contract(?:/|$)|^(?:\\.\\./)+contract(?:/|$)",
    message: "shared domain은 runtime 경계 contract에 의존하지 않습니다.",
  },
  sharedRuntimeTechnology: {
    regex: "^node:|^next(?:/|$)|^react(?:/|$)",
    message: "shared는 runtime 구현 대신 공개 값과 순수 계약 변환을 사용합니다.",
  },
  sharedDomainTechnology: {
    // `@beads-desk/bd/issue`와 `/types`는 값 없는 이슈 model이므로 공통 업무 규칙이 쓸 수 있습니다.
    regex: "^(?![./]|@/shared/domain(?:/|$)|@beads-desk/bd/(?:issue|types)$).+",
    message: "shared domain은 공통 업무 규칙만 사용하며 외부 기술과 저장 계약에 의존하지 않습니다.",
  },
  testSupportFromProduction: {
    regex: "^@?vitest(?:[-/]|$)|\\.testkit$",
    message:
      "테스트가 아닌 파일은 vitest와 테스트 지원 파일(`*.testkit.ts`, `*.testkit.tsx`)을 import하지 않습니다. 테스트에서만 쓰는 코드는 `*.testkit.ts`로 둡니다.",
  },
  clientUiFromApplication: {
    regex: "^@/client/ui(?:/|$)|^(?:\\.\\./)+ui(?:/|$)",
    message: "client application은 UI에 의존하지 않습니다.",
  },
  clientTechnologyFromApplication: {
    regex: "^next(?:/|$)|\\.css$",
    message: "client application은 화면·browser adapter 기술 대신 UI나 infra 경계를 사용합니다.",
  },
  clientHigherFromInfra: {
    regex:
      "^@/client/(?:ui|modules/[^/]+/application)(?:/|$)|^(?:\\.\\./)+(?:ui|modules/[^/]+/application)(?:/|$)",
    message: "client infra는 UI와 application에 의존하지 않습니다.",
  },
  clientOuterFromDomain: {
    regex:
      "^@/client/(?:ui|infra|modules/[^/]+/application)(?:/|$)|^(?:\\.\\./)+(?:ui|infra|application|[^/]+/application|modules/[^/]+/application)(?:/|$)",
    message: "client domain은 application과 바깥 adapter layer에 의존하지 않습니다.",
  },
  clientTechnologyFromDomain: {
    regex: "^react(?:/|$)|^next(?:/|$)|\\.css$",
    message: "client domain은 UI framework와 browser adapter 기술에 의존하지 않습니다.",
  },
};

const clientBoundaries = [boundaries.serverFromClient, boundaries.bdServerPackage];

const clientAdapterGlobals = [
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "fetch",
  "EventSource",
  "process",
  "URL",
];
const clientUiGlobals = [
  {
    name: "fetch",
    message: "Client UI는 HTTP를 직접 호출하지 않고 infra adapter를 사용합니다.",
  },
  {
    name: "EventSource",
    message: "Client UI는 서버 이벤트를 직접 구독하지 않고 infra adapter를 사용합니다.",
  },
  {
    name: "localStorage",
    message: "Client UI는 browser storage를 직접 읽지 않고 infra adapter를 사용합니다.",
  },
  {
    name: "sessionStorage",
    message: "Client UI는 browser storage를 직접 읽지 않고 infra adapter를 사용합니다.",
  },
];
// 파일 단위 순환은 oxlint의 `import/no-cycle`이, layer 방향과 root 구조는
// `packages/app/src/server/architecture.test.ts`가 검사합니다.

const restrict = (...patterns) => ({
  "@typescript-eslint/no-restricted-imports": ["error", { patterns }],
});

// 테스트 지원 파일(`*.testkit.ts`, `*.testkit.tsx`)은 테스트 파일처럼 production layer 규칙에서 뺍니다.
// `packages/app/src/server/architecture.test.ts`도 이 값을 읽어 같은 파일을 테스트 코드로 봅니다.
// `.oxlintrc.json`은 이 값을 import할 수 없어서 `react/jsx-no-literals` override의 `excludeFiles`에 `.tsx` glob을 따로 적습니다.
// 이 값을 고치면 그 사본도 함께 고칩니다. 두 값이 다르면 `architecture.test.ts`가 실패합니다.
export const testCode = ["**/*.test.ts", "**/*.test.tsx", "**/*.testkit.ts", "**/*.testkit.tsx"];

export default defineConfig([
  globalIgnores(["**/node_modules/**", "**/.next/**", "**/next-env.d.ts", "**/dist/**"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    // Playwright fixture가 값을 넘기는 `use` 인자를 React의 `use` hook으로 오인합니다.
    files: ["packages/app/e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  {
    files: ["packages/bd/src/**/*.ts"],
    rules: restrict(boundaries.bdPackage),
  },
  {
    files: ["packages/bd/src/types.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program > :not(ExportNamedDeclaration[exportKind='type'][source])",
          message:
            "`@beads-desk/bd/types`는 다른 module의 type을 `export type { ... } from`으로만 다시 내보냅니다.",
        },
      ],
    },
  },
  {
    files: ["packages/promo/**/*.{ts,tsx}"],
    rules: restrict(boundaries.promoPackage),
  },
  {
    files: ["packages/playground/**/*.ts"],
    rules: restrict(boundaries.playgroundPackage),
  },
  {
    // 아래 layer 규칙이 `@typescript-eslint/no-restricted-imports`의 패턴을 덮어쓰므로, 모든 layer에 걸리는 이 규칙은 base rule로 따로 둡니다.
    // bd package는 app의 server bundle에 들어가므로 같은 규칙을 겁니다.
    files: ["packages/app/src/**/*.{ts,tsx}", "packages/bd/src/**/*.ts"],
    ignores: testCode,
    rules: {
      "no-restricted-imports": ["error", { patterns: [boundaries.testSupportFromProduction] }],
    },
  },
  {
    files: ["packages/app/src/server/**/*.{ts,tsx}"],
    rules: restrict(boundaries.parentFileImport, boundaries.clientFromServer),
  },
  {
    files: ["packages/app/src/server/modules/*/application/**/*.{ts,tsx}"],
    ignores: testCode,
    rules: restrict(
      boundaries.parentFileImport,
      boundaries.clientFromServer,
      boundaries.serverOuterFromApplication,
      boundaries.serverTechnologyFromApplication,
    ),
  },
  {
    files: ["packages/app/src/server/modules/*/domain/**/*.{ts,tsx}"],
    rules: restrict(
      boundaries.parentFileImport,
      boundaries.clientFromServer,
      boundaries.serverOuterFromDomain,
      boundaries.serverTechnologyFromDomain,
    ),
  },
  {
    files: ["packages/app/src/app/(server)/**/*.{ts,tsx}"],
    rules: restrict(boundaries.serverRouteSurface),
  },
  {
    files: ["packages/app/src/app/(client)/**/*.{ts,tsx}"],
    rules: restrict(boundaries.bdServerPackage, boundaries.clientRouteServerSurface),
  },
  {
    files: ["packages/app/src/app/*.{ts,tsx}"],
    rules: restrict(boundaries.bdServerPackage, boundaries.serverFromAppRoot),
  },
  {
    files: ["packages/app/src/shared/**/*.{ts,tsx}"],
    ignores: testCode,
    rules: {
      ...restrict(
        boundaries.sharedIsolation,
        boundaries.sharedRuntimeTechnology,
        boundaries.bdServerPackage,
      ),
      "no-restricted-globals": [
        "error",
        {
          globals: [
            "window",
            "document",
            "navigator",
            "localStorage",
            "sessionStorage",
            "fetch",
            "EventSource",
            "process",
            "setTimeout",
            "clearTimeout",
            "setInterval",
            "clearInterval",
            "requestAnimationFrame",
          ],
          checkGlobalObject: true,
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "NewExpression[callee.name='Date'][arguments.length=0], CallExpression[callee.name='Date'], MemberExpression[object.name='Date'][property.name='now'], MemberExpression[object.name='Math'][property.name='random']",
          message:
            "shared는 현재 시각과 난수를 직접 만들지 않고 호출자가 전달한 값으로 계산합니다.",
        },
      ],
    },
  },
  {
    files: ["packages/app/src/shared/domain/**/*.{ts,tsx}"],
    ignores: testCode,
    rules: restrict(
      boundaries.sharedIsolation,
      boundaries.sharedContractFromDomain,
      boundaries.sharedDomainTechnology,
    ),
  },
  {
    files: ["packages/app/src/client/**/*.{ts,tsx}"],
    rules: restrict(...clientBoundaries),
  },
  {
    files: ["packages/app/src/client/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", ...clientUiGlobals],
    },
  },
  {
    files: ["packages/app/src/client/modules/*/application/**/*.{ts,tsx}"],
    ignores: testCode,
    rules: {
      ...restrict(
        ...clientBoundaries,
        boundaries.clientUiFromApplication,
        boundaries.clientTechnologyFromApplication,
      ),
      "no-restricted-globals": ["error", ...clientAdapterGlobals],
    },
  },
  {
    files: ["packages/app/src/client/infra/**/*.{ts,tsx}"],
    rules: restrict(...clientBoundaries, boundaries.clientHigherFromInfra),
  },
  {
    files: ["packages/app/src/client/modules/*/domain/**/*.{ts,tsx}"],
    rules: {
      ...restrict(
        ...clientBoundaries,
        boundaries.clientOuterFromDomain,
        boundaries.clientTechnologyFromDomain,
      ),
      "no-restricted-globals": ["error", ...clientAdapterGlobals],
    },
  },
]);
