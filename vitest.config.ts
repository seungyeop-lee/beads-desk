import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/.next/**", "**/dist/**"],
  },
});
