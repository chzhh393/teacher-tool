import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

const makeSessionSeed = () => ({
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
})

describe("TT_student_upsert", () => {
  it("creates student with defaults", async () => {
    globalThis.__mockDb = createMockDb({
      ...makeSessionSeed(),
      TT_students: [],
    })

    const { main } = await import("../../cloudfunctions/TT_student_upsert/index.js")

    const result = await main({
      token: "token-1",
      student: { classId: "class-1", name: "Student A" },
    })

    expect(result.student).toBeTruthy()
    expect(result.student.level).toBe(1)
    expect(result.student.totalScore).toBe(0)

    const students = globalThis.__mockDb.__getCollection("TT_students")
    expect(students.length).toBe(1)
    expect(students[0].data.name).toBe("Student A")
  })

  it("rejects when class student count exceeds limit", async () => {
    const students = Array.from({ length: 100 }, (_, idx) => ({
      _id: `stu-${idx + 1}`,
      data: { classId: "class-1", name: `S${idx + 1}` },
    }))

    globalThis.__mockDb = createMockDb({
      ...makeSessionSeed(),
      TT_students: students,
    })

    const { main } = await import("../../cloudfunctions/TT_student_upsert/index.js")

    await expect(
      main({
        token: "token-1",
        student: { classId: "class-1", name: "Overflow" },
      })
    ).rejects.toThrow()
  })
})
