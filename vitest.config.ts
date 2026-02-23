import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/templates/**"],
      thresholds: {
        statements: 15,
        branches: 60,
        functions: 40,
        lines: 15,
      },
    },
    testTimeout: 10_000,
    hookTimeout: 10_000,
    restoreMocks: true,
  },
});
