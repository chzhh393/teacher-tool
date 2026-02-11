import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_shop_save / TT_shop_list", () => {
  it("saves items, removes stale ones, and lists by class", async () => {
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
      TT_shop_items: [
        { _id: "item-1", data: { classId: "class-1", name: "Old A", order: 0 } },
        { _id: "item-2", data: { classId: "class-1", name: "Old B", order: 1 } },
        { _id: "item-x", data: { classId: "class-2", name: "Other", order: 0 } },
      ],
    })

    const { main: save } = await import("../../cloudfunctions/TT_shop_save/index.js")
    const { main: list } = await import("../../cloudfunctions/TT_shop_list/index.js")

    await save({
      token: "token-1",
      classId: "class-1",
      items: [
        { id: "item-1", name: "Updated A", cost: 2 },
        { name: "New C", cost: 3 },
      ],
    })

    const itemsCollection = globalThis.__mockDb.__getCollection("TT_shop_items")
    const class1Items = itemsCollection.filter((doc) => (doc.data.classId || doc.classId) === "class-1")
    expect(class1Items.length).toBe(2)
    expect(class1Items.some((doc) => doc._id === "item-2")).toBe(false)
    expect(class1Items.some((doc) => doc.data.name === "Updated A")).toBe(true)
    expect(class1Items.some((doc) => doc.data.name === "New C")).toBe(true)

    const result = await list({ token: "token-1", classId: "class-1" })
    expect(result.items).toHaveLength(2)
    expect(result.items.every((item) => item.classId === "class-1")).toBe(true)
    expect(result.items.map((item) => item.order)).toEqual([0, 1])
  })
})
