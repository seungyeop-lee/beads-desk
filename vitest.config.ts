import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "@/": new URL("./packages/app/src/", import.meta.url).pathname,
    },
    environment: "node",
    globals: false,
    include: ["**/*.test.ts"],
    // packages/bd/src/realBd는 설치된 실제 bd를 실행하므로 `pnpm run test:bd`로 따로 실행합니다.
    exclude: [...configDefaults.exclude, "**/.next/**", "**/dist/**", "packages/bd/src/realBd/**"],
  },
});
