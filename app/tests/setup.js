import Module from "node:module"
import { EventEmitter } from "node:events"

globalThis.__mockConfig = {
  strict: true,
  defaultLimit: 100,
  requireWhere: true,
  requireLimit: true,
  allowFullScanCollections: [
    "TT_activation_codes",
    "TT_users",
    "TT_classes",
    "TT_students",
    "TT_sessions",
    "TT_shop_items",
  ],
}

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
  if (id === "https") {
    return {
      get: (url, cb) => {
        const res = new EventEmitter()
        const queue = Array.isArray(globalThis.__httpsMockQueue)
          ? globalThis.__httpsMockQueue
          : []
        let response = {}
        for (let i = 0; i < queue.length; i += 1) {
          const item = queue[i]
          if (!item || !item.match || item.match.test(url)) {
            response = item?.response ?? item ?? {}
            queue.splice(i, 1)
            break
          }
        }
        process.nextTick(() => {
          cb(res)
          const payload = JSON.stringify(response || {})
          res.emit("data", payload)
          res.emit("end")
        })
        return {
          on: (event, handler) => {
            if (event === "error" && globalThis.__httpsMockError) {
              process.nextTick(() => handler(globalThis.__httpsMockError))
            }
          },
        }
      },
    }
  }
  return originalRequire.call(this, id, ...rest)
}
