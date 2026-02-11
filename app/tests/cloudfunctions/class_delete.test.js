import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_class_delete", () => {
  it("archives and deletes class data", async () => {
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
      TT_classes: [{ _id: "class-1", data: { userId: "user-1", name: "Class A" } }],
      TT_students: [{ _id: "stu-1", data: { classId: "class-1", name: "S1" } }],
      TT_score_records: [{ _id: "rec-1", data: { classId: "class-1" } }],
      TT_redeem_records: [{ _id: "red-1", data: { classId: "class-1" } }],
      TT_shop_items: [{ _id: "item-1", data: { classId: "class-1" } }],
      TT_shares: [{ _id: "share-1", data: { classId: "class-1" } }],
      TT_groups: [{ _id: "group-1", data: { classId: "class-1" } }],
      TT_settings: [{ _id: "settings-class-1", data: { classId: "class-1" } }],
      TT_users: [
        {
          _id: "sub-1",
          data: { parentUserId: "user-1", authorizedClassIds: ["class-1"] },
        },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_class_delete/index.js")
    const result = await main({ token: "token-1", classId: "class-1" })

    expect(result.ok).toBe(true)
    expect(result.archived.students).toBe(1)

    expect(globalThis.__mockDb.__getCollection("TT_classes").length).toBe(0)
    expect(globalThis.__mockDb.__getCollection("TT_students").length).toBe(0)
    expect(globalThis.__mockDb.__getCollection("TT_score_records").length).toBe(0)
    expect(globalThis.__mockDb.__getCollection("TT_redeem_records").length).toBe(0)
    expect(globalThis.__mockDb.__getCollection("TT_shop_items").length).toBe(0)
    expect(globalThis.__mockDb.__getCollection("TT_shares").length).toBe(0)
    expect(globalThis.__mockDb.__getCollection("TT_groups").length).toBe(0)

    const archive = globalThis.__mockDb.__getCollection("TT_archive")
    expect(archive.length).toBeGreaterThan(0)

    const sub = globalThis.__mockDb.__getCollection("TT_users")[0]
    expect(sub.data.authorizedClassIds).toEqual([])
  })
})
