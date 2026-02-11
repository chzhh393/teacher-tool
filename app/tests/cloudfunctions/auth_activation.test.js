import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("Auth flows", () => {
  it("rejects invalid registration input and duplicate username", async () => {
    globalThis.__mockDb = createMockDb({
      TT_users: [
        { _id: "user-1", data: { username: "teacher", passwordHash: "hashed:pass" } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_auth_register/index.js")

    await expect(main({ username: "ab", password: "123456" })).rejects.toThrow()
    await expect(main({ username: "teacher", password: "123456" })).rejects.toThrow()
    await expect(main({ username: "teacher2", password: "123" })).rejects.toThrow()
  })

  it("activates user and marks activation code used", async () => {
    globalThis.__mockDb = createMockDb({
      TT_users: [
        {
          _id: "user-1",
          data: { _id: "user-1", username: "teacher", passwordHash: "hashed:pass", activated: false },
        },
      ],
      TT_activation_codes: [
        { _id: "code-1", data: { code: "ABC123", used: false } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_auth_activate/index.js")
    const result = await main({ username: "teacher", code: "ABC123" })

    expect(result.token).toBeTruthy()
    const user = globalThis.__mockDb.__getCollection("TT_users")[0]
    const code = globalThis.__mockDb.__getCollection("TT_activation_codes")[0]
    const sessions = globalThis.__mockDb.__getCollection("TT_sessions")

    expect(user.data.activated).toBe(true)
    expect(code.data.used).toBe(true)
    expect(sessions.length).toBe(1)
  })

  it("rejects expired or used activation codes", async () => {
    globalThis.__mockDb = createMockDb({
      TT_users: [
        {
          _id: "user-1",
          data: { _id: "user-1", username: "teacher", passwordHash: "hashed:pass", activated: false },
        },
      ],
      TT_activation_codes: [
        { _id: "code-1", data: { code: "ABC123", used: true } },
        { _id: "code-2", data: { code: "DEF456", used: false, expiresAt: "2020-01-01T00:00:00.000Z" } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_auth_activate/index.js")

    await expect(main({ username: "teacher", code: "ABC123" })).rejects.toThrow()
    await expect(main({ username: "teacher", code: "DEF456" })).rejects.toThrow()
  })

  it("logs in with correct password and rejects wrong password", async () => {
    globalThis.__mockDb = createMockDb({
      TT_users: [
        {
          _id: "user-1",
          data: { _id: "user-1", username: "teacher", passwordHash: "hashed:pass", activated: true },
        },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_auth_login/index.js")

    await expect(main({ username: "teacher", password: "bad" })).rejects.toThrow()
    const result = await main({ username: "teacher", password: "pass" })
    expect(result.token).toBeTruthy()
    const sessions = globalThis.__mockDb.__getCollection("TT_sessions")
    expect(sessions.length).toBe(1)
  })
})
