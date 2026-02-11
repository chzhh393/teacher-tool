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

describe("TT_record_list", () => {
  it("paginates records in descending time order", async () => {
    const records = Array.from({ length: 25 }, (_, idx) => ({
      _id: `rec-${idx + 1}`,
      data: {
        classId: "class-1",
        studentName: "Student A",
        score: 1,
        type: "add",
        createdAt: new Date(2026, 0, idx + 1),
      },
    }))

    globalThis.__mockDb = createMockDb({
      ...makeSessionSeed(),
      TT_score_records: records,
    })

    const { main } = await import("../../cloudfunctions/TT_record_list/index.js")

    const result = await main({
      token: "token-1",
      classId: "class-1",
      page: 2,
      pageSize: 10,
    })

    expect(result.total).toBe(25)
    expect(result.records).toHaveLength(10)
    const ids = result.records.map((r) => r.id)
    expect(ids).toEqual([
      "rec-15",
      "rec-14",
      "rec-13",
      "rec-12",
      "rec-11",
      "rec-10",
      "rec-9",
      "rec-8",
      "rec-7",
      "rec-6",
    ])
  })

  it("filters by student name and paginates in memory", async () => {
    const records = [
      { _id: "rec-1", data: { classId: "class-1", studentName: "Alice", createdAt: new Date() } },
      { _id: "rec-2", data: { classId: "class-1", studentName: "Bob", createdAt: new Date() } },
      { _id: "rec-3", data: { classId: "class-1", studentName: "Alicia", createdAt: new Date() } },
      { _id: "rec-4", data: { classId: "class-1", studentName: "Alice", createdAt: new Date() } },
    ]

    globalThis.__mockDb = createMockDb({
      ...makeSessionSeed(),
      TT_score_records: records,
    })

    const { main } = await import("../../cloudfunctions/TT_record_list/index.js")

    const result = await main({
      token: "token-1",
      classId: "class-1",
      studentName: "Ali",
      page: 1,
      pageSize: 2,
    })

    expect(result.total).toBe(3)
    expect(result.records).toHaveLength(2)
    expect(result.records.every((r) => r.studentName.includes("Ali"))).toBe(true)
  })
})

describe("TT_record_export", () => {
  it("exports CSV and returns temp url", async () => {
    globalThis.__lastUpload = null
    globalThis.__mockDb = createMockDb({
      ...makeSessionSeed(),
      TT_score_records: [
        {
          _id: "rec-1",
          data: {
            classId: "class-1",
            studentName: "A",
            type: "add",
            ruleName: "Rule A",
            score: 1,
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
          },
        },
        {
          _id: "rec-2",
          data: {
            classId: "class-1",
            studentName: "B",
            type: "subtract",
            ruleName: "Rule B",
            score: -1,
            createdAt: new Date("2026-02-03T00:00:00.000Z"),
          },
        },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_record_export/index.js")
    const result = await main({ token: "token-1", classId: "class-1" })

    expect(result.csvUrl).toContain("https://example.test/mock.csv")
    expect(globalThis.__lastUpload).toBeTruthy()
    const csv = globalThis.__lastUpload.fileContent.toString()
    const lines = csv.split("\n")
    expect(lines[0]).toContain("时间")
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain("B")
  })
})
