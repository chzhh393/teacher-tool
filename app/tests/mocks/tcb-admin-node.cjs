module.exports = {
  SYMBOL_CURRENT_ENV: "test",
  init: () => ({
    database: () => globalThis.__mockDb,
    uploadFile: async () => ({ fileID: "mock-file-id" }),
    getTempFileURL: async () => ({
      fileList: [{ tempFileURL: "https://example.test/mock.csv" }],
    }),
  }),
}
