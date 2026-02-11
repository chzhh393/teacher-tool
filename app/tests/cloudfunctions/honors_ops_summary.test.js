import { describe, expect, it, vi } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_honors_list", () => {
  it("returns student and group ranks", async () => {
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
        { _id: "stu-1", data: { classId: "class-1", name: "A", badges: 2, earnedScore: 10 } },
        { _id: "stu-2", data: { classId: "class-1", name: "B", badges: 2, earnedScore: 5 } },
        { _id: "stu-3", data: { classId: "class-1", name: "C", badges: 1, earnedScore: 20 } },
      ],
      TT_groups: [
        { _id: "g-1", data: { classId: "class-1", name: "G1", memberIds: ["stu-1", "stu-3"] } },
        { _id: "g-2", data: { classId: "class-1", name: "G2", memberIds: ["stu-2"] } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_honors_list/index.js")
    const result = await main({ token: "token-1", classId: "class-1" })

    expect(result.ranks[0].name).toBe("A")
    expect(result.groupRanks[0].group.name).toBe("G1")
    expect(result.groupRanks[0].totalEarnedScore).toBe(30)
  })
})

describe("TT_ops_overview", () => {
  it("aggregates stats and user classes", async () => {
    globalThis.__mockDb = createMockDb({
      TT_users: [
        { _id: "user-1", data: { username: "u1", role: "main", createdAt: "2026-02-01" } },
        { _id: "user-2", data: { username: "u2", role: "main", createdAt: "2026-02-02", activated: true } },
      ],
      TT_classes: [
        { _id: "class-1", data: { userId: "user-1", name: "C1", createdAt: "2026-02-03" } },
      ],
      TT_students: [
        { _id: "stu-1", data: { classId: "class-1", createdAt: "2026-02-04" } },
      ],
      TT_sessions: [
        { _id: "sess-1", data: { userId: "user-1", createdAt: "2026-02-05" } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_ops_overview/index.js")
    const result = await main({})

    expect(result.stats.totalUsers).toBe(2)
    expect(result.stats.totalClasses).toBe(1)
    expect(result.stats.totalStudents).toBe(1)
    expect(result.users[0].classCount).toBeDefined()
  })
})

describe("TT_record_summary", () => {
  it("summarizes records within time range", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-11T00:00:00.000Z"))
    const now = Date.now()

    globalThis.__mockDb = createMockDb({
      TT_sessions: [
        {
          _id: "sess-1",
          data: {
            token: "token-1",
            userId: "user-1",
            role: "main",
            nickname: "Teacher",
            expiredAt: new Date(now + 60_000).toISOString(),
          },
        },
      ],
      TT_classes: [{ _id: "class-1", data: { userId: "user-1" } }],
      TT_score_records: [
        { _id: "rec-1", data: { classId: "class-1", studentId: "stu-1", studentName: "A", ruleId: "r1", ruleName: "Rule", score: 2, type: "add", createdAt: now } },
        { _id: "rec-2", data: { classId: "class-1", studentId: "stu-1", studentName: "A", ruleId: "r2", ruleName: "Rule2", score: -1, type: "subtract", createdAt: now } },
        { _id: "rec-3", data: { classId: "class-1", studentId: "stu-1", studentName: "A", ruleId: "r3", ruleName: "Rule3", score: 5, type: "add", createdAt: now, revoked: true } },
        { _id: "rec-4", data: { classId: "class-1", studentId: "stu-1", studentName: "A", ruleId: "r4", ruleName: "Rule4", score: 0, type: "revoke", createdAt: now } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_record_summary/index.js")
    const result = await main({ token: "token-1", classId: "class-1", timeRange: "week" })

    expect(result.classSummary.totalAddCount).toBe(1)
    expect(result.classSummary.totalSubtractCount).toBe(1)
    expect(result.classSummary.netScore).toBe(1)

    vi.useRealTimers()
  })
})
