import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_activation_admin", () => {
  it("returns stats and lists with filters", async () => {
    globalThis.__mockDb = createMockDb({
      TT_activation_codes: [
        { _id: "code-1", data: { code: "AAA111", used: true, deviceCount: 3, createdAt: "2026-02-01" } },
        { _id: "code-2", data: { code: "BBB222", revoked: true, createdAt: "2026-02-02" } },
        { _id: "code-3", data: { code: "CCC333", used: false, revoked: false, createdAt: "2026-02-03" } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_activation_admin/index.js")

    const stats = await main({ action: "stats" })
    expect(stats.total).toBe(3)
    expect(stats.used).toBe(1)
    expect(stats.revoked).toBe(1)
    expect(stats.unused).toBe(1)
    expect(stats.fullLoaded).toBe(1)

    const list = await main({ action: "list", status: "unused", search: "ccc" })
    expect(list.total).toBe(1)
    expect(list.records[0].code).toBe("CCC333")
  })

  it("generates codes, clears devices, and revokes", async () => {
    globalThis.__mockDb = createMockDb({
      TT_activation_codes: [
        { _id: "code-1", data: { code: "ZZZ999", deviceCount: 2, deviceFingerprints: ["a", "b"] } },
      ],
    })

    const { main } = await import("../../cloudfunctions/TT_activation_admin/index.js")

    const gen = await main({ action: "generate", count: 2, batchName: "batch" })
    expect(gen.count).toBe(2)
    const all = globalThis.__mockDb.__getCollection("TT_activation_codes")
    expect(all.length).toBe(3)

    const cleared = await main({ action: "clearDevices", code: "zzz999" })
    expect(cleared.ok).toBe(true)
    const updated = all.find((row) => (row.data.code || row.code) === "ZZZ999")
    expect(updated.data.deviceCount).toBe(0)
    expect(updated.data.deviceFingerprints.length).toBe(0)

    const revoked = await main({ action: "revoke", code: "ZZZ999" })
    expect(revoked.ok).toBe(true)
    const latest = globalThis.__mockDb.__getCollection("TT_activation_codes")
      .find((row) => (row.data.code || row.code) === "ZZZ999")
    expect(latest.data.revoked).toBe(true)
  })
})
