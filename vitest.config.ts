import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/db", "packages/task-backend", "packages/adapters/opencode-local", "server", "ui", "cli"],
  },
});
