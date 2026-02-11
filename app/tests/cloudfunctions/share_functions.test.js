import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_share_create / TT_share_view", () => {
  it("creates, lists, revokes share and renders student share", async () => {
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
      TT_students: [
        { _id: "stu-1", data: { classId: "class-1", name: "Student A", totalScore: 10 } },
      ],
      TT_score_records: [
        { _id: "rec-1", data: { classId: "class-1", studentId: "stu-1", ruleName: "Rule A", score: 2, type: "add", createdAt: new Date() } },
      ],
      TT_settings: [{ _id: "settings-class-1", data: { classId: "class-1", systemName: "成长值" } }],
    })

    const { main: create } = await import("../../cloudfunctions/TT_share_create/index.js")
    const { main: view } = await import("../../cloudfunctions/TT_share_view/index.js")

    const created = await create({
      token: "token-1",
      action: "create",
      type: "student",
      classId: "class-1",
      studentId: "stu-1",
    })
    expect(created.shareToken).toBeTruthy()

    const listed = await create({ token: "token-1", action: "list" })
    expect(listed.shares.length).toBe(1)

    const rendered = await view({ shareToken: created.shareToken })
    expect(rendered.type).toBe("student")
    expect(rendered.student.name).toBe("Student A")
    expect(rendered.recentRecords.length).toBe(1)

    const revoked = await create({ token: "token-1", action: "revoke", shareToken: created.shareToken })
    expect(revoked.ok).toBe(true)
  })
})
