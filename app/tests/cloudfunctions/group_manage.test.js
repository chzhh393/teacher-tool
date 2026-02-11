import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

const makeSeed = () => ({
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
  TT_students: [
    { _id: "stu-1", data: { classId: "class-1", name: "S1" } },
    { _id: "stu-2", data: { classId: "class-1", name: "S2" } },
    { _id: "stu-3", data: { classId: "class-2", name: "S3" } },
  ],
})

describe("TT_group_manage", () => {
  it("lists groups in order", async () => {
    globalThis.__mockDb = createMockDb({
      ...makeSeed(),
      TT_groups: [
        { _id: "g-1", data: { classId: "class-1", name: "G1", order: 2 } },
        { _id: "g-2", data: { classId: "class-1", name: "G2", order: 0 } },
        { _id: "g-3", data: { classId: "class-1", name: "G3", order: 1 } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_group_manage/index.js")
    const result = await main({ action: "list", token: "token-1", classId: "class-1" })

    expect(result.groups.map((g) => g.name)).toEqual(["G2", "G3", "G1"])
  })

  it("rejects duplicate members across groups", async () => {
    globalThis.__mockDb = createMockDb({
      ...makeSeed(),
      TT_groups: [],
    })

    const { main } = await import("../../cloudfunctions/TT_group_manage/index.js")

    await expect(
      main({
        action: "save",
        token: "token-1",
        classId: "class-1",
        groups: [
          { name: "G1", memberIds: ["stu-1"] },
          { name: "G2", memberIds: ["stu-1"] },
        ],
      })
    ).rejects.toThrow()
  })

  it("rejects members not in the class", async () => {
    globalThis.__mockDb = createMockDb({
      ...makeSeed(),
      TT_groups: [],
    })

    const { main } = await import("../../cloudfunctions/TT_group_manage/index.js")

    await expect(
      main({
        action: "save",
        token: "token-1",
        classId: "class-1",
        groups: [{ name: "G1", memberIds: ["stu-3"] }],
      })
    ).rejects.toThrow()
  })
})
