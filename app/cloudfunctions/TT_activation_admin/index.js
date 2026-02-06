const tcb = require("tcb-admin-node")

const CODE_REG = /^[A-Z0-9]{6}$/
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const MAX_PAGE_SIZE = 100
const MAX_GENERATE = 200
const MAX_SCAN = 2000

const unwrap = (row) => (row?.data ? row.data : row)

const normalizeCode = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

const makeCode = () => {
  let out = ""
  for (let i = 0; i < 6; i += 1) {
    out += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length))
  }
  return out
}

const formatRow = (row) => {
  const raw = unwrap(row)
  if (!raw) return null
  return {
    ...raw,
    _id: raw._id || row._id,
  }
}

const getDeviceCount = (row) => {
  if (typeof row.deviceCount === "number") return row.deviceCount
  if (typeof row.device_count === "number") return row.device_count
  const fingerprints = row.deviceFingerprints || row.device_fingerprints
  if (Array.isArray(fingerprints)) return fingerprints.length
  return 0
}

const listAll = async (collection) => {
  const result = await collection.limit(MAX_SCAN).get()
  return (result.data || []).map(formatRow).filter(Boolean)
}

exports.main = async (event = {}) => {
  const action = event.action || "list"
  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const collection = db.collection("TT_activation_codes")

  if (action === "stats") {
    const records = await listAll(collection)
    const total = records.length
    const used = records.filter((item) => item.used).length
    const revoked = records.filter((item) => item.revoked).length
    const unused = records.filter((item) => !item.used && !item.revoked).length
    const fullLoaded = records.filter((item) => getDeviceCount(item) >= 3).length

    return {
      total,
      used,
      unused,
      revoked,
      fullLoaded,
    }
  }

  if (action === "list") {
    const page = Math.max(1, Number(event.page) || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(event.pageSize) || 20))
    const skip = (page - 1) * pageSize
    const status = String(event.status || "")
    const keyword = String(event.search || "").toLowerCase().trim()

    const allRecords = await listAll(collection)

    // 1. 关键词过滤
    const searched = keyword
      ? allRecords.filter((item) => {
          const code = String(item.code || "").toLowerCase()
          const batch = String(item.batchName || item.batch_name || "").toLowerCase()
          return code.includes(keyword) || batch.includes(keyword)
        })
      : allRecords

    // 2. 状态过滤
    const filtered = searched.filter((item) => {
      if (status === "used") return item.used === true
      if (status === "unused") return !item.used && !item.revoked
      if (status === "revoked") return item.revoked === true
      return true
    })

    // 3. 按创建时间降序排序
    filtered.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()
      return tb - ta
    })

    const total = filtered.length
    const records = filtered.slice(skip, skip + pageSize)

    return {
      records,
      total,
      page,
      pageSize,
    }
  }

  if (action === "generate") {
    const count = Math.min(MAX_GENERATE, Math.max(1, Number(event.count) || 1))
    const batchName = String(event.batchName || "手动生成批次")
    const expiresAt = event.expiresAt ? new Date(event.expiresAt) : null
    const now = new Date()

    const existing = new Set()
    const existingRows = await listAll(collection)
    existingRows.forEach((item) => {
      if (item.code) existing.add(String(item.code).toUpperCase())
    })

    const codes = []
    let safety = 0

    while (codes.length < count && safety < count * 20) {
      safety += 1
      const code = makeCode()
      if (existing.has(code)) continue
      existing.add(code)
      codes.push(code)
    }

    for (const code of codes) {
      await collection.add({
        data: {
          code,
          batchName,
          used: false,
          revoked: false,
          deviceCount: 0,
          deviceFingerprints: [],
          usageHistory: [],
          createdAt: now,
          updatedAt: now,
          expiresAt,
        },
      })
    }

    return {
      count: codes.length,
      codes,
      batchName,
    }
  }

  if (action === "clearDevices") {
    const code = normalizeCode(event.code)
    if (!CODE_REG.test(code)) {
      throw new Error("激活码格式不正确")
    }

    const result = await collection.where({ code }).limit(1).get()
    const row = result.data?.[0]
    if (!row) {
      throw new Error("激活码不存在")
    }

    const raw = unwrap(row) || {}
    let usageHistory = raw.usageHistory || raw.usage_history || []
    if (!Array.isArray(usageHistory)) {
      usageHistory = []
    }

    usageHistory.push({
      timestamp: new Date().toISOString(),
      action: "clear_devices",
    })

    await collection.doc(row._id).update({
      data: {
        deviceCount: 0,
        deviceFingerprints: [],
        usageHistory,
        updatedAt: new Date(),
      },
    })

    return { ok: true }
  }

  if (action === "revoke") {
    const code = normalizeCode(event.code)
    if (!CODE_REG.test(code)) {
      throw new Error("激活码格式不正确")
    }

    const result = await collection.where({ code }).limit(1).get()
    const row = result.data?.[0]
    if (!row) {
      throw new Error("激活码不存在")
    }

    await collection.doc(row._id).update({
      data: {
        revoked: true,
        revokedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return { ok: true }
  }

  throw new Error("不支持的操作")
}
