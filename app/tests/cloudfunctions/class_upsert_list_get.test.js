import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

const sessionSeed = {
  TT_sessions: [
    {
      _id: "sess-1",
      data: {
        token: "token-1",
        userId: "user-1",
        username: "teacher",
        role: "main",
        nickname: "Teacher",
        expiredAt: new Date(Date.now() + 60_000).toISOString(),
      },
    },
  ],
}

describe("TT_class_upsert / TT_class_list / TT_class_get", () => {
  it("creates class and lists it", async () => {
    globalThis.__mockDb = createMockDb({
      ...sessionSeed,
      TT_classes: [],
    })

    const { main: upsert } = await import("../../cloudfunctions/TT_class_upsert/index.js")
    const { main: list } = await import("../../cloudfunctions/TT_class_list/index.js")

    const created = await upsert({
      token: "token-1",
      classInfo: { id: "class-1", name: "Class A" },
    })
    expect(created.classInfo.id).toBe("class-1")

    const listed = await list({ token: "token-1" })
    expect(listed.classes).toHaveLength(1)
    expect(listed.classes[0].name).toBe("Class A")
  })

  it("returns class summary with totals", async () => {
    globalThis.__mockDb = createMockDb({
      ...sessionSeed,
      TT_classes: [{ _id: "class-1", data: { userId: "user-1", name: "Class A" } }],
      TT_students: [
        { _id: "stu-1", data: { classId: "class-1", totalScore: 10, badges: 1, level: 2 } },
        { _id: "stu-2", data: { classId: "class-1", totalScore: 5, badges: 0, level: 1 } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_class_get/index.js")
    const result = await main({ token: "token-1", classId: "class-1" })
    expect(result.classSummary.studentCount).toBe(2)
    expect(result.classSummary.totalScore).toBe(15)
    expect(result.classSummary.totalBadges).toBe(1)
  })
})
