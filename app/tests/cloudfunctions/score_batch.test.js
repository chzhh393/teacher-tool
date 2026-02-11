import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_score_batch", () => {
  it("updates students and writes score records", async () => {
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
      TT_classes: [
        { _id: "class-1", data: { userId: "user-1", name: "Class A" } },
      ],
      TT_students: [
        {
          _id: "stu-1",
          data: {
            classId: "class-1",
            name: "Student A",
            totalScore: 4,
            availableScore: 4,
            level: 1,
            progress: 0,
          },
        },
        {
          _id: "stu-2",
          data: {
            classId: "class-2",
            name: "Student B",
            totalScore: 10,
          },
        },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_score_batch/index.js")

    const result = await main({
      token: "token-1",
      classId: "class-1",
      studentIds: ["stu-1", "stu-2"],
      ruleId: "rule-1",
      ruleName: "Homework",
      score: 1,
    })

    expect(result.updatedStudentIds).toEqual(["stu-1"])

    const students = globalThis.__mockDb.__getCollection("TT_students")
    const student = students.find((doc) => doc._id === "stu-1")
    expect(student.data.totalScore).toBe(5)
    expect(student.data.availableScore).toBe(5)
    expect(student.data.level).toBe(2)

    const records = globalThis.__mockDb.__getCollection("TT_score_records")
    expect(records.length).toBe(1)
    expect(records[0].data.studentId).toBe("stu-1")
    expect(records[0].data.type).toBe("add")
  })
})
