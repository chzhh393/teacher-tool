const tcb = require("tcb-admin-node")
const crypto = require("crypto")

const USERNAME_REG = /^[A-Za-z0-9_]{6,}$/
const CODE_REG = /^[A-Z0-9]{6}$/

const unwrap = (row) => (row?.data ? row.data : row)

const normalizeCode = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")

const findUserByUsername = async (db, username) => {
  const result = await db.collection("TT_users").get()
  return (result.data || [])
    .map((row) => unwrap(row))
    .find((row) => row && row.username === username)
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
    const allResult = await db.collection("TT_activation_codes").get()
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
  const { username } = event
  const normalizedCode = normalizeCode(event.code)

  if (!username || !normalizedCode) {
    throw new Error("username 与 code 为必填")
  }
  if (!USERNAME_REG.test(username)) {
    throw new Error("用户名格式不正确")
  }
  if (!CODE_REG.test(normalizedCode)) {
    throw new Error("激活码格式不正确")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  const user = await findUserByUsername(db, username)
  if (!user) {
    throw new Error("用户不存在")
  }
  if (!user._id) {
    throw new Error("账号数据异常")
  }
  if (user.activated === true) {
    throw new Error("账号已激活")
  }

  const codeInfo = await findActivationCode(db, normalizedCode)
  if (!codeInfo || !codeInfo.raw) {
    throw new Error("激活码不存在")
  }

  const codeRow = codeInfo.raw
  if (codeRow.used || codeRow.usedAt || codeRow.usedBy) {
    throw new Error("激活码已使用")
  }
  if (codeRow.expiresAt && new Date(codeRow.expiresAt).getTime() < now.getTime()) {
    throw new Error("激活码已过期")
  }

  await db.collection("TT_users").doc(user._id).update({
    data: {
      activated: true,
      activatedAt: now,
      activationCode: normalizedCode,
      updatedAt: now,
    },
  })

  if (codeInfo.id) {
    await db.collection("TT_activation_codes").doc(codeInfo.id).update({
      data: {
        used: true,
        usedAt: now,
        usedBy: user._id,
        usedByUsername: user.username,
      },
    })
  }

  const userRole = user.role || "main"
  const nickname = user.nickname || user.username

  const token = crypto.randomBytes(24).toString("hex")
  await db.collection("TT_sessions").add({
    data: {
      token,
      userId: user._id,
      username: user.username,
      role: userRole,
      nickname,
      authorizedClassIds: user.authorizedClassIds || [],
      createdAt: now,
      expiredAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
    },
  })

  return { token, username: user.username, role: userRole, nickname }
}
