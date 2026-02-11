import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_subaccount_manage", () => {
  it("creates and lists subaccounts", async () => {
    globalThis.__mockDb = createMockDb({
      TT_sessions: [
        {
          _id: "sess-1",
          data: {
            token: "token-1",
            userId: "user-1",
            role: "main",
            nickname: "Teacher",
            expiredAt: new Date(Date.now() + 60_000).toISOString(),
          },
        },
      ],
      TT_classes: [{ _id: "class-1", data: { userId: "user-1" } }],
      TT_users: [],
    })

    const { main } = await import("../../cloudfunctions/TT_subaccount_manage/index.js")
    const created = await main({
      token: "token-1",
      action: "create",
      username: "subuser",
      password: "secret1",
      authorizedClassIds: ["class-1"],
    })
    expect(created.subAccount.username).toBe("subuser")

    const listed = await main({ token: "token-1", action: "list" })
    expect(listed.subAccounts.length).toBe(1)
  })

  it("updates and deletes subaccounts", async () => {
    globalThis.__mockDb = createMockDb({
      TT_sessions: [
        {
          _id: "sess-main",
          data: {
            token: "token-1",
            userId: "user-1",
            role: "main",
            nickname: "Teacher",
            expiredAt: new Date(Date.now() + 60_000).toISOString(),
          },
        },
        { _id: "sess-sub", data: { userId: "sub-1", nickname: "Old", authorizedClassIds: [] } },
      ],
      TT_classes: [{ _id: "class-1", data: { userId: "user-1" } }],
      TT_users: [
        { _id: "sub-1", data: { _id: "sub-1", username: "sub1", role: "sub", parentUserId: "user-1" } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_subaccount_manage/index.js")

    const updated = await main({
      token: "token-1",
      action: "update",
      subAccountId: "sub-1",
      nickname: "New",
      authorizedClassIds: ["class-1"],
    })
    expect(updated.ok).toBe(true)

    const sessions = globalThis.__mockDb.__getCollection("TT_sessions")
    const subSession = sessions.find((s) => s._id === "sess-sub")
    expect(subSession.data.nickname).toBe("New")
    expect(subSession.data.authorizedClassIds).toEqual(["class-1"])

    const deleted = await main({ token: "token-1", action: "delete", subAccountId: "sub-1" })
    expect(deleted.ok).toBe(true)
    expect(globalThis.__mockDb.__getCollection("TT_users").length).toBe(0)
    expect(globalThis.__mockDb.__getCollection("TT_sessions").length).toBe(1)
  })
})
