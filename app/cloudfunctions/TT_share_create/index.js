const tcb = require("tcb-admin-node")
const crypto = require("crypto")

const SHARE_DOMAIN = "https://learn-fun.cn"
const DEFAULT_EXPIRE_DAYS = 30

const verifyToken = async (db, token) => {
  if (!token) return null
  const _ = db.command
  const result = await db
    .collection("TT_sessions")
    .where(_.or([{ token }, { "data.token": token }]))
    .limit(1)
    .get()
  const session = (result.data || [])[0]
  if (!session) return null
  const raw = session.data || session
  if (raw.expiredAt && new Date(raw.expiredAt).getTime() < Date.now()) return null
  return {
    userId: raw.userId,
    username: raw.username,
    role: raw.role || "main",
    nickname: raw.nickname || raw.username,
    authorizedClassIds: raw.authorizedClassIds || [],
  }
}

const verifyClassAccess = async (db, classId, user) => {
  if (user.role === "sub") {
    return (user.authorizedClassIds || []).includes(classId)
  }
  const classDoc = await db.collection("TT_classes").doc(classId).get()
  const classRow = classDoc.data?.[0]
  const raw = classRow?.data || classRow
  return raw && raw.userId === user.userId
}

exports.main = async (event = {}) => {
  const { token, action } = event

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const _ = db.command

  // 1. 验证 token
  const user = await verifyToken(db, token)
  if (!user) {
    throw new Error("未授权：无效的token")
  }

  // action: create
  if (action === "create") {
    const { type, classId, studentId } = event
    if (!type || !classId) {
      throw new Error("缺少必要参数: type, classId")
    }
    if (type !== "class" && type !== "student") {
      throw new Error("type 必须是 class 或 student")
    }
    if (type === "student" && !studentId) {
      throw new Error("student 类型需要提供 studentId")
    }

    // 验证班级权限
    const hasAccess = await verifyClassAccess(db, classId, user)
    if (!hasAccess) {
      throw new Error("未授权：无权访问该班级")
    }

    // 检查是否已有有效分享
    const now = new Date().toISOString()
    const existQuery = type === "student"
      ? _.or([
          { "data.classId": classId, "data.studentId": studentId, "data.type": "student", "data.revoked": false },
          { classId, studentId, type: "student", revoked: false },
        ])
      : _.or([
          { "data.classId": classId, "data.type": "class", "data.revoked": false },
          { classId, type: "class", revoked: false },
        ])

    const existResult = await db.collection("TT_shares").where(existQuery).limit(10).get()
    const existing = (existResult.data || []).find((item) => {
      const r = item.data || item
      return r.expiresAt && new Date(r.expiresAt).getTime() > Date.now()
    })

    if (existing) {
      const r = existing.data || existing
      return {
        shareToken: r.token,
        shareUrl: `${SHARE_DOMAIN}/#/s/${r.token}`,
        expiresAt: r.expiresAt,
      }
    }

    // 查询班级名称
    const classDoc = await db.collection("TT_classes").doc(classId).get()
    const classRow = classDoc.data?.[0]
    const classRaw = classRow?.data || classRow
    const className = classRaw?.name || "未知班级"

    // 查询学生名称（仅 student 类型）
    let studentName = null
    if (type === "student") {
      const stuDoc = await db.collection("TT_students").doc(studentId).get()
      const stuRow = stuDoc.data?.[0]
      const stuRaw = stuRow?.data || stuRow
      studentName = stuRaw?.name || "未知学生"
    }

    // 生成令牌
    const shareToken = crypto.randomBytes(16).toString("hex")
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRE_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const addResult = await db.collection("TT_shares").add({
      data: {
        token: shareToken,
        type,
        classId,
        studentId: studentId || null,
        className,
        studentName,
        userId: user.userId,
        createdAt: now,
        expiresAt,
        revoked: false,
      },
    })

    if (!addResult.id) {
      throw new Error("写入分享记录失败")
    }

    return {
      shareToken,
      shareUrl: `${SHARE_DOMAIN}/#/s/${shareToken}`,
      expiresAt,
    }
  }

  // action: list
  if (action === "list") {
    const query = _.or([
      { "data.userId": user.userId },
      { userId: user.userId },
    ])
    const result = await db.collection("TT_shares").where(query).limit(100).get()
    const shares = (result.data || [])
      .map((item) => {
        const r = item.data || item
        return {
          token: r.token,
          type: r.type,
          className: r.className,
          studentName: r.studentName,
          createdAt: r.createdAt,
          expiresAt: r.expiresAt,
          revoked: r.revoked || false,
        }
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

    return { shares }
  }

  // action: revoke
  if (action === "revoke") {
    const { shareToken } = event
    if (!shareToken) {
      throw new Error("缺少 shareToken")
    }

    const query = _.or([
      { "data.token": shareToken },
      { token: shareToken },
    ])
    const result = await db.collection("TT_shares").where(query).limit(1).get()
    const doc = (result.data || [])[0]
    if (!doc) {
      throw new Error("分享不存在")
    }

    const raw = doc.data || doc
    if (raw.userId !== user.userId) {
      throw new Error("无权撤销此分享")
    }

    await db.collection("TT_shares").doc(doc._id).update({
      data: { revoked: true },
    })

    return { ok: true }
  }

  throw new Error("未知 action: " + action)
}
