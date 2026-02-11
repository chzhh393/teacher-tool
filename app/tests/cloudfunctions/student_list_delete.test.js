import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_student_list / TT_student_delete", () => {
  it("lists students sorted and deletes student with group cleanup", async () => {
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
      TT_students: [
        { _id: "stu-1", data: { _id: "stu-1", classId: "class-1", name: "A", order: 2 } },
        { _id: "stu-2", data: { _id: "stu-2", classId: "class-1", name: "B", order: 1 } },
      ],
      TT_groups: [
        { _id: "group-1", data: { classId: "class-1", memberIds: ["stu-1", "stu-2"] } },
      ],
    })

    const { main: list } = await import("../../cloudfunctions/TT_student_list/index.js")
    const listed = await list({ token: "token-1", classId: "class-1" })
    expect(listed.students.map((s) => s.id)).toEqual(["stu-2", "stu-1"])

    const { main: del } = await import("../../cloudfunctions/TT_student_delete/index.js")
    const result = await del({ token: "token-1", studentId: "stu-1" })
    expect(result.ok).toBe(true)

    const students = globalThis.__mockDb.__getCollection("TT_students")
    expect(students.length).toBe(1)
    const group = globalThis.__mockDb.__getCollection("TT_groups")[0]
    expect(group.data.memberIds).toEqual(["stu-2"])
    const archive = globalThis.__mockDb.__getCollection("TT_archive")
    expect(archive.length).toBe(1)
  })
})
