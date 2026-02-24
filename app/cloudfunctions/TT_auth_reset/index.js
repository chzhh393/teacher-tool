const tcb = require("tcb-admin-node")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const USERNAME_REG = /^[A-Za-z0-9_]{6,}$/
const CODE_REG = /^[A-Z0-9]{6}$/

const unwrap = (row) => (row?.data ? row.data : row)

const normalizeCode = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

const findUserByUsername = async (db, username) => {
  const _ = db.command
  const result = await db
    .collection("TT_users")
    .where(_.or([{ username }, { "data.username": username }]))
    .limit(10)
    .get()
  const row = (result.data || []).map((r) => unwrap(r)).find((r) => r && r.username === username)
  return row || null
}

const findActivationCode = async (db, code) => {
  let result = await db.collection("TT_activation_codes").where({ code }).limit(1).get()
  let row = (result.data || [])[0]

  if (!row) {
    result = await db
      .collection("TT_activation_codes")
      .where({ "data.code": code })
      .limit(1)
      .get()
    row = (result.data || [])[0]
  }

  if (!row) {
    const allResult = await db.collection("TT_activation_codes").limit(1000).get()
    row = (allResult.data || []).find((item) => {
      const raw = unwrap(item)
      return raw && normalizeCode(raw.code) === code
    })
  }

  if (!row) return null

  const raw = unwrap(row)
  return {
    raw,
    id: row._id || raw?._id,
  }
}

exports.main = async (event = {}) => {
  const { action } = event

  // --- 通过激活码查询用户名 ---
  if (action === "lookup") {
    const normalizedCode = normalizeCode(event.code)
    if (!normalizedCode || !CODE_REG.test(normalizedCode)) {
      throw new Error("激活码格式不正确")
    }

    const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
    const db = app.database()

    const codeInfo = await findActivationCode(db, normalizedCode)
    if (!codeInfo || !codeInfo.raw) {
      throw new Error("激活码不存在")
    }

    const codeRow = codeInfo.raw
    if (!codeRow.usedByUsername) {
      throw new Error("该激活码尚未绑定账号")
    }

    return { username: codeRow.usedByUsername }
  }

  // --- 重置密码 ---
  const { username, newPassword } = event
  const normalizedCode = normalizeCode(event.code)

  if (!username || !normalizedCode || !newPassword) {
    throw new Error("username、code、newPassword 为必填")
  }
  if (!USERNAME_REG.test(username)) {
    throw new Error("用户名格式不正确")
  }
  if (!CODE_REG.test(normalizedCode)) {
    throw new Error("激活码格式不正确")
  }
  if (String(newPassword).length < 6) {
    throw new Error("新密码至少 6 位")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  // 1. 查找用户（必须已激活）
  const user = await findUserByUsername(db, username)
  if (!user) {
    throw new Error("用户不存在")
  }
  if (!user._id) {
    throw new Error("账号数据异常")
  }
  if (user.activated !== true) {
    throw new Error("账号未激活，请先激活")
  }

  // 2. 校验激活码
  const codeInfo = await findActivationCode(db, normalizedCode)
  if (!codeInfo || !codeInfo.raw) {
    throw new Error("激活码不存在")
  }

  const codeRow = codeInfo.raw
  if (codeRow.used || codeRow.usedAt || codeRow.usedBy) {
    // 允许用户用自己的激活码重置密码
    if (codeRow.usedBy !== user._id && codeRow.usedByUsername !== user.username) {
      throw new Error("激活码已使用")
    }
  }
  if (codeRow.expiresAt && new Date(codeRow.expiresAt).getTime() < now.getTime()) {
    throw new Error("激活码已过期")
  }

  // 3. 更新密码
  const passwordHash = await bcrypt.hash(String(newPassword), 10)
  await db.collection("TT_users").doc(user._id).update({
    data: {
      passwordHash,
      updatedAt: now,
    },
  })

  // 4. 标记激活码已使用（如果是新激活码才标记，自己的旧码跳过）
  const isOwnCode = codeRow.usedBy === user._id || codeRow.usedByUsername === user.username
  if (codeInfo.id && !isOwnCode) {
    await db.collection("TT_activation_codes").doc(codeInfo.id).update({
      data: {
        used: true,
        usedAt: now,
        usedBy: user._id,
        usedByUsername: user.username,
        usedPurpose: "reset",
      },
    })
  }

  // 5. 创建 session 并返回
  const userRole = user.role || "main"
  const nickname = user.nickname || user.username
  const canRedeem = user.canRedeem || false

  const token = crypto.randomBytes(24).toString("hex")
  await db.collection("TT_sessions").add({
    data: {
      token,
      userId: user._id,
      username: user.username,
      role: userRole,
      nickname,
      authorizedClassIds: user.authorizedClassIds || [],
      canRedeem,
      createdAt: now,
      expiredAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
    },
  })

  return { token, username: user.username, role: userRole, nickname, canRedeem }
}
