import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["dotenv/config", "./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 50,
        "src/features/authentication/**": {
          lines: 75,
          functions: 75,
          statements: 75,
          branches: 65,
        },
        "src/core/utils/authorization.utils.ts": {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 80,
        },
      },
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/test/**",
        "src/schema/typeDefs.graphql",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
