import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_auth_verify / TT_auth_logout", () => {
  it("verifies session and returns wechat info", async () => {
    globalThis.__mockDb = createMockDb({
      TT_sessions: [
        {
          _id: "sess-1",
          data: {
            token: "token-1",
            userId: "user-1",
            username: "teacher",
            role: "main",
            nickname: "T",
            canRedeem: true,
            expiredAt: new Date(Date.now() + 60_000).toISOString(),
          },
        },
      ],
      TT_users: [
        {
          _id: "user-1",
          data: {
            _id: "user-1",
            activated: true,
            wechatOpenId: "openid",
            wechatNickname: "wx",
            wechatAvatar: "avatar",
          },
        },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_auth_verify/index.js")
    const result = await main({ token: "token-1" })
    expect(result.ok).toBe(true)
    expect(result.wechatBound.nickname).toBe("wx")
  })

  it("logs out sessions by token", async () => {
    globalThis.__mockDb = createMockDb({
      TT_sessions: [
        { _id: "sess-1", data: { token: "token-1" } },
        { _id: "sess-2", data: { token: "token-2" } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_auth_logout/index.js")
    const result = await main({ token: "token-1" })
    expect(result.ok).toBe(true)
    const sessions = globalThis.__mockDb.__getCollection("TT_sessions")
    expect(sessions.length).toBe(1)
    expect(sessions[0].data.token).toBe("token-2")
  })
})
