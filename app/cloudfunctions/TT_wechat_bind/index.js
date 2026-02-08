const tcb = require("tcb-admin-node")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const unwrap = (row) => (row?.data ? row.data : row)

exports.main = async (event = {}) => {
  const { tempToken, username, password } = event

  if (!tempToken || !username || !password) {
    throw new Error("tempToken、username、password 为必填")
  }

  const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  const db = app.database()
  const now = new Date()

  // 1. 验证 tempToken
  let tempResult = await db.collection("TT_wechat_temps").where({ tempToken }).limit(1).get()
  let tempRow = (tempResult.data || [])[0]
  if (!tempRow) {
    tempResult = await db.collection("TT_wechat_temps").where({ "data.tempToken": tempToken }).limit(1).get()
    tempRow = (tempResult.data || [])[0]
  }
  if (!tempRow) {
    throw new Error("绑定链接无效或已过期，请重新扫码")
  }

  const tempDoc = unwrap(tempRow)

  if (tempDoc.expiredAt && new Date(tempDoc.expiredAt).getTime() < Date.now()) {
    throw new Error("绑定链接已过期，请重新扫码")
  }

  const { openId, unionId, nickname, avatar } = tempDoc

  // 2. 验证账号密码
  const userResult = await db.collection("TT_users").limit(1000).get()
  const allUsers = (userResult.data || []).map((r) => unwrap(r))
  const user = allUsers.find((u) => u && u.username === username)

  if (!user) {
    throw new Error("用户不存在")
  }

  const match = await bcrypt.compare(String(password), user.passwordHash || "")
  if (!match) {
    throw new Error("密码错误")
  }

  if (user.activated === false) {
    throw new Error("账号未激活，请先激活后再绑定微信")
  }

  // 3. 检查 openid 未被其他账号绑定
  const existingUser = allUsers.find((u) => u && u.wechatOpenId === openId && u._id !== user._id)
  if (existingUser) {
    throw new Error("此微信已绑定其他账号")
  }

  // 4. 检查当前账号是否已绑定其他微信
  if (user.wechatOpenId && user.wechatOpenId !== openId) {
    throw new Error("当前账号已绑定其他微信，请先解绑")
  }

  // 5. 写入微信字段
  await db.collection("TT_users").doc(user._id).update({
    data: {
      wechatOpenId: openId,
      wechatUnionId: unionId || "",
      wechatNickname: nickname || "",
      wechatAvatar: avatar || "",
      wechatBoundAt: now,
      updatedAt: now,
    },
  })

  // 6. 删除临时记录
  await db.collection("TT_wechat_temps").doc(tempRow._id).remove()

  // 7. 创建登录会话
  const token = crypto.randomBytes(24).toString("hex")
  await db.collection("TT_sessions").add({
    data: {
      token,
      userId: user._id,
      username: user.username,
      createdAt: now,
      expiredAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
    },
  })

  return { token, username: user.username }
}
