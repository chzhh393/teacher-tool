import { defineConfig } from "vitest/config"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "tcb-admin-node": resolve(rootDir, "tests/mocks/tcb-admin-node.cjs"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    clearMocks: true,
  },
})
