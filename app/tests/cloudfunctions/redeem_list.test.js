import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_redeem_list", () => {
  it("returns paginated records and total", async () => {
    const records = Array.from({ length: 30 }, (_, idx) => ({
      _id: `redeem-${idx + 1}`,
      data: {
        classId: "class-1",
        studentId: "stu-1",
        itemId: "item-1",
        createdAt: new Date(2026, 0, idx + 1),
      },
    }))

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
      TT_redeem_records: records,
    })

    const { main } = await import("../../cloudfunctions/TT_redeem_list/index.js")

    const result = await main({
      token: "token-1",
      classId: "class-1",
      page: 2,
      pageSize: 10,
    })

    expect(result.total).toBe(30)
    expect(result.records).toHaveLength(10)
    expect(result.records.every((r) => r.classId === "class-1")).toBe(true)
  })
})
