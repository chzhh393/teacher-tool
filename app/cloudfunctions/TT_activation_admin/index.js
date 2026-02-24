const tcb = require("tcb-admin-node")

const CODE_REG = /^[A-Z0-9]{6}$/
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const MAX_PAGE_SIZE = 100
const MAX_GENERATE = 200

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
  const BATCH = 1000
  let all = []
  let offset = 0
  while (true) {
    const result = await collection.skip(offset).limit(BATCH).get()
    const batch = (result.data || []).map(formatRow).filter(Boolean)
    all = all.concat(batch)
    if (batch.length < BATCH) break
    offset += BATCH
  }
  return all
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
    const keyword = String(event.search || "").toUpperCase().trim()

    const _ = db.command

    // 1. 构建数据库查询条件
    const conditions = []

    if (keyword) {
      // 激活码精确匹配（支持部分输入时按前缀匹配）
      conditions.push(_.or([
        { code: keyword },
        { "data.code": keyword },
        { batchName: keyword },
        { "data.batchName": keyword },
      ]))
    }

    if (status === "used") {
      conditions.push(_.or([{ used: true }, { "data.used": true }]))
    } else if (status === "unused") {
      conditions.push(_.or([{ used: _.neq(true) }, { "data.used": _.neq(true) }]))
      conditions.push(_.or([{ revoked: _.neq(true) }, { "data.revoked": _.neq(true) }]))
    } else if (status === "revoked") {
      conditions.push(_.or([{ revoked: true }, { "data.revoked": true }]))
    }

    // 2. 执行查询
    let query = conditions.length > 0
      ? collection.where(_.and(conditions))
      : collection

    const countResult = await query.count()
    const total = countResult.total || 0

    const result = await query
      .orderBy("createdAt", "desc")
      .skip(skip)
      .limit(pageSize)
      .get()

    const records = (result.data || []).map(formatRow).filter(Boolean)

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
