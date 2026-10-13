import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "@/": new URL("./packages/app/src/", import.meta.url).pathname,
    },
    environment: "node",
    globals: false,
    include: ["**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/.next/**", "**/dist/**"],
  },
});
