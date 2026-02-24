# 数据库请求优化方案与具体变更

日期: 2026-02-11

## 背景
数据库请求占比过高, 云资源按请求量计费. 目标是先用最小改动降低单次请求的数据库读次数, 不改变业务逻辑.

## 变更方案
1. 合并会话查询
每个云函数在校验 token 时, 原来会查询两次: 先查根字段 token, 失败再查 data.token. 改为一次 OR 查询, 每次调用至少减少 1 次数据库请求.

2. 复用班级文档
在 TT_class_get 中, 已经拿到班级文档时不再重复读取同一班级.

## 具体变更
1. 会话查询从双次查询改为单次 OR
变更前(示意):
- where({ token })
- 若无结果, where({ "data.token": token })

变更后(示意):
- where(_.or([{ token }, { "data.token": token }]))
- limit(1)

2. TT_class_get 复用班级文档
变更前: getClassId 仅返回 id, 之后再次 doc(id).get() 读取班级
变更后: getClassInfo 返回 id 与 raw, 直接使用 raw.name, 避免重复读取

## 涉及文件
- cloudfunctions/TT_auth_verify/index.js
- cloudfunctions/TT_class_delete/index.js
- cloudfunctions/TT_class_get/index.js
- cloudfunctions/TT_class_list/index.js
- cloudfunctions/TT_class_upsert/index.js
- cloudfunctions/TT_group_manage/index.js
- cloudfunctions/TT_honors_list/index.js
- cloudfunctions/TT_record_export/index.js
- cloudfunctions/TT_record_list/index.js
- cloudfunctions/TT_record_summary/index.js
- cloudfunctions/TT_redeem_list/index.js
- cloudfunctions/TT_score_batch/index.js
- cloudfunctions/TT_score_revoke/index.js
- cloudfunctions/TT_settings_get/index.js
- cloudfunctions/TT_settings_save/index.js
- cloudfunctions/TT_share_create/index.js
- cloudfunctions/TT_shop_list/index.js
- cloudfunctions/TT_shop_redeem/index.js
- cloudfunctions/TT_shop_save/index.js
- cloudfunctions/TT_student_delete/index.js
- cloudfunctions/TT_student_list/index.js
- cloudfunctions/TT_student_upsert/index.js
- cloudfunctions/TT_subaccount_manage/index.js
- cloudfunctions/TT_wechat_callback/index.js
- cloudfunctions/TT_wechat_state/index.js

## 预期收益
- 每个命中 verifyToken 或 findSession 的云函数调用, 至少减少 1 次数据库请求.
- TT_class_get 额外减少 1 次班级文档读取.

## 影响范围
- 仅改变读取方式, 不改变查询条件与业务流程.
- 不影响接口返回结构.

## 风险与回滚
- 风险较低, 仅查询条件合并.
- 回滚方式: 将 OR 查询恢复为两次查询, 或恢复 TT_class_get 的二次读取.

## 后续可选优化(未实施)
1. TT_record_list 分页翻页时跳过 count() 以减少 1 次数据库请求.
2. 对高频读接口增加更长 TTL 或服务端缓存.
