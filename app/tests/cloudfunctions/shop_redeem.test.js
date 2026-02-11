import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

const baseSeed = {
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
  TT_classes: [
    {
      _id: "class-1",
      data: { userId: "user-1", name: "Class A" },
    },
  ],
  TT_students: [
    {
      _id: "stu-1",
      data: {
        classId: "class-1",
        name: "Student A",
        availableScore: 10,
      },
    },
  ],
  TT_shop_items: [
    {
      _id: "item-1",
      data: {
        classId: "class-1",
        name: "Sticker",
        cost: 5,
        stock: 2,
      },
    },
  ],
}

describe("TT_shop_redeem", () => {
  it("redeems item and updates stock + student score", async () => {
    globalThis.__mockDb = createMockDb(baseSeed)
    const { main } = await import("../../cloudfunctions/TT_shop_redeem/index.js")

    const result = await main({
      token: "token-1",
      studentId: "stu-1",
      itemId: "item-1",
    })

    expect(result.redeemRecord).toBeTruthy()

    const student = globalThis.__mockDb.__getCollection("TT_students")[0]
    const item = globalThis.__mockDb.__getCollection("TT_shop_items")[0]
    const records = globalThis.__mockDb.__getCollection("TT_redeem_records")

    expect(student.data.availableScore).toBe(5)
    expect(item.data.stock).toBe(1)
    expect(records.length).toBe(1)
    expect(records[0].data.itemId).toBe("item-1")
  })

  it("rejects when score is insufficient", async () => {
    const seed = JSON.parse(JSON.stringify(baseSeed))
    seed.TT_students[0].data.availableScore = 2
    globalThis.__mockDb = createMockDb(seed)
    const { main } = await import("../../cloudfunctions/TT_shop_redeem/index.js")

    await expect(
      main({
        token: "token-1",
        studentId: "stu-1",
        itemId: "item-1",
      })
    ).rejects.toThrow()
  })

  it("rejects when stock is zero", async () => {
    const seed = JSON.parse(JSON.stringify(baseSeed))
    seed.TT_shop_items[0].data.stock = 0
    globalThis.__mockDb = createMockDb(seed)
    const { main } = await import("../../cloudfunctions/TT_shop_redeem/index.js")

    await expect(
      main({
        token: "token-1",
        studentId: "stu-1",
        itemId: "item-1",
      })
    ).rejects.toThrow()
  })
})
