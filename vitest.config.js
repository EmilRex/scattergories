import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.js"],
    testTimeout: 10000,
    setupFiles: ["./tests/mocks/setup.js"],
  },
});
