import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("WeChat flows", () => {
  it("creates state for login and bind", async () => {
    globalThis.__mockDb = createMockDb({
      TT_sessions: [
        {
          _id: "sess-1",
          data: {
            token: "token-1",
            userId: "user-1",
            role: "main",
            expiredAt: new Date(Date.now() + 60_000).toISOString(),
          },
        },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_wechat_state/index.js")

    const loginState = await main({ purpose: "login" })
    expect(loginState.state).toBeTruthy()
    const states = globalThis.__mockDb.__getCollection("TT_wechat_states")
    expect(states.length).toBe(1)

    const bindState = await main({ purpose: "bind", token: "token-1" })
    expect(bindState.state).toBeTruthy()
    const statesAfter = globalThis.__mockDb.__getCollection("TT_wechat_states")
    const bindDoc = statesAfter.find((s) => s.data.state === bindState.state)
    expect(bindDoc.data.userId).toBe("user-1")
  })

  it("handles callback bind and login", async () => {
    globalThis.__httpsMockQueue = [
      { match: /oauth2\/access_token/, response: { access_token: "t", openid: "openid-1", unionid: "u1" } },
      { match: /sns\/userinfo/, response: { nickname: "Nick", headimgurl: "Avatar", unionid: "u1" } },
    ]

    globalThis.__mockDb = createMockDb({
      TT_wechat_states: [
        {
          _id: "state-1",
          data: { state: "state-1", purpose: "bind", userId: "user-1", expiredAt: new Date(Date.now() + 60_000).toISOString() },
        },
      ],
      TT_users: [
        { _id: "user-1", data: { _id: "user-1", username: "u1", activated: true } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_wechat_callback/index.js")
    const bindResult = await main({ code: "code", state: "state-1" })
    expect(bindResult.action).toBe("bind_success")

    const user = globalThis.__mockDb.__getCollection("TT_users")[0]
    expect(user.data.wechatOpenId).toBe("openid-1")

    globalThis.__httpsMockQueue = [
      { match: /oauth2\/access_token/, response: { access_token: "t2", openid: "openid-2", unionid: "u2" } },
      { match: /sns\/userinfo/, response: { nickname: "Nick2", headimgurl: "Avatar2", unionid: "u2" } },
    ]

    globalThis.__mockDb = createMockDb({
      TT_wechat_states: [
        {
          _id: "state-2",
          data: { state: "state-2", purpose: "login", userId: null, expiredAt: new Date(Date.now() + 60_000).toISOString() },
        },
      ],
      TT_users: [
        { _id: "user-2", data: { _id: "user-2", username: "u2", activated: true, wechatOpenId: "openid-2" } },
      ],
    })

    const loginResult = await main({ code: "code", state: "state-2" })
    expect(loginResult.action).toBe("login")
    const sessions = globalThis.__mockDb.__getCollection("TT_sessions")
    expect(sessions.length).toBe(1)
  })

  it("binds wechat with temp token", async () => {
    globalThis.__mockDb = createMockDb({
      TT_wechat_temps: [
        {
          _id: "temp-1",
          data: {
            tempToken: "temp-1",
            openId: "openid-1",
            unionId: "u1",
            nickname: "Nick",
            avatar: "Avatar",
            expiredAt: new Date(Date.now() + 60_000).toISOString(),
          },
        },
      ],
      TT_users: [
        { _id: "user-1", data: { _id: "user-1", username: "u1", passwordHash: "hashed:pass", activated: true } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_wechat_bind/index.js")
    const result = await main({ tempToken: "temp-1", username: "u1", password: "pass" })
    expect(result.token).toBeTruthy()

    const user = globalThis.__mockDb.__getCollection("TT_users")[0]
    expect(user.data.wechatOpenId).toBe("openid-1")
    expect(globalThis.__mockDb.__getCollection("TT_wechat_temps").length).toBe(0)
  })
})
