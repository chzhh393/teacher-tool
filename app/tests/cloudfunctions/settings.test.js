import { describe, expect, it } from "vitest"
import { createMockDb } from "../helpers/mockDb.js"

describe("TT_settings_get / TT_settings_save", () => {
  it("saves settings and returns them", async () => {
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
      TT_settings: [],
    })

    const { main: save } = await import("../../cloudfunctions/TT_settings_save/index.js")
    const { main: get } = await import("../../cloudfunctions/TT_settings_get/index.js")

    await save({
      token: "token-1",
      classId: "class-1",
      settings: { systemName: "成长值", levelThresholds: [0, 10] },
    })

    const result = await get({ token: "token-1", classId: "class-1" })
    expect(result.settings.systemName).toBe("成长值")
    const classDoc = globalThis.__mockDb.__getCollection("TT_classes")[0]
    expect(classDoc.data.settingsId).toBe("settings-class-1")
  })
})
