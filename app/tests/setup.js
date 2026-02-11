import Module from "node:module"

const originalRequire = Module.prototype.require

Module.prototype.require = function patchedRequire(id, ...rest) {
  if (id === "tcb-admin-node") {
    return {
      SYMBOL_CURRENT_ENV: "test",
      init: () => ({
        database: () => globalThis.__mockDb,
        uploadFile: async ({ cloudPath, fileContent } = {}) => {
          globalThis.__lastUpload = { cloudPath, fileContent }
          return { fileID: "mock-file-id" }
        },
        getTempFileURL: async () => ({
          fileList: [{ tempFileURL: "https://example.test/mock.csv" }],
        }),
      }),
    }
  }
  if (id === "bcryptjs") {
    return {
      hash: async (value) => `hashed:${value}`,
      compare: async (value, hashed) => hashed === `hashed:${value}`,
    }
  }
  return originalRequire.call(this, id, ...rest)
}
