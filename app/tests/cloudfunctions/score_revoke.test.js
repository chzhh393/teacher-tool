import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_score_revoke", () => {
  it("reverts score and marks record revoked", async () => {
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
        {
          _id: "stu-1",
          data: {
            classId: "class-1",
            name: "Student A",
            totalScore: 5,
            availableScore: 5,
            level: 2,
            badges: 0,
            collectedBeasts: [],
          },
        },
      ],
      TT_score_records: [
        {
          _id: "rec-1",
          data: {
            classId: "class-1",
            studentId: "stu-1",
            studentName: "Student A",
            score: 5,
            type: "add",
          },
        },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_score_revoke/index.js")

    const result = await main({ token: "token-1", recordId: "rec-1" })
    expect(result.ok).toBe(true)

    const student = globalThis.__mockDb.__getCollection("TT_students")[0]
    expect(student.data.totalScore).toBe(0)
    expect(student.data.availableScore).toBe(0)

    const records = globalThis.__mockDb.__getCollection("TT_score_records")
    const revoked = records.find((doc) => doc._id === "rec-1")
    expect(revoked.data.revoked).toBe(true)

    const revokeLog = records.find((doc) => doc.data.type === "revoke")
    expect(revokeLog).toBeTruthy()
  })
})
