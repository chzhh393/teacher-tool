import { useEffect, useState } from "react"
import { CloudApi } from "../services/cloudApi"
import Modal from "./Modal"
import type { SubAccount, ClassInfo } from "../types"

const SubAccountManager = () => {
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<SubAccount | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>("")

  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    nickname: "",
    authorizedClassIds: [] as string[],
    canRedeem: false,
  })

  const [editForm, setEditForm] = useState({
    nickname: "",
    password: "",
    authorizedClassIds: [] as string[],
    canRedeem: false,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const classesRes = await CloudApi.classList()
      setClasses(classesRes.classes || [])
    } catch (err) {
      console.error("加载班级列表失败:", err)
    }
    try {
      const accountsRes = await CloudApi.subAccountList()
      setSubAccounts(accountsRes.subAccounts || [])
    } catch (err) {
      console.error("加载子账号列表失败:", err)
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!createForm.username.trim() || !createForm.password.trim() || !createForm.nickname.trim()) {
      setError("用户名、密码和昵称为必填项")
      return
    }
    if (createForm.password.length < 6) {
      setError("密码至少需要6位")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      await CloudApi.subAccountCreate(createForm)
      setShowCreateModal(false)
      setCreateForm({ username: "", password: "", nickname: "", authorizedClassIds: [], canRedeem: false })
      await loadData()
    } catch (err: any) {
      setError(err?.message || "创建失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingAccount) return
    if (!editForm.nickname.trim()) {
      setError("昵称为必填项")
      return
    }
    if (editForm.password && editForm.password.length < 6) {
      setError("密码至少需要6位")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      const payload: any = {
        subAccountId: editingAccount.id,
        nickname: editForm.nickname,
        authorizedClassIds: editForm.authorizedClassIds,
        canRedeem: editForm.canRedeem,
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password
      }
      await CloudApi.subAccountUpdate(payload)
      setShowEditModal(false)
      setEditingAccount(null)
      setEditForm({ nickname: "", password: "", authorizedClassIds: [], canRedeem: false })
      await loadData()
    } catch (err: any) {
      setError(err?.message || "更新失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (account: SubAccount) => {
    if (!window.confirm(`确认删除子账号「${account.nickname}」吗？`)) return
    try {
      await CloudApi.subAccountDelete({ subAccountId: account.id })
      await loadData()
    } catch (err: any) {
      alert(err?.message || "删除失败")
    }
  }

  const openEditModal = (account: SubAccount) => {
    setEditingAccount(account)
    setEditForm({
      nickname: account.nickname,
      password: "",
      authorizedClassIds: account.authorizedClassIds,
      canRedeem: account.canRedeem || false,
    })
    setError("")
    setShowEditModal(true)
  }

  const toggleClass = (classId: string, isCreate: boolean) => {
    if (isCreate) {
      setCreateForm(prev => ({
        ...prev,
        authorizedClassIds: prev.authorizedClassIds.includes(classId)
          ? prev.authorizedClassIds.filter(id => id !== classId)
          : [...prev.authorizedClassIds, classId],
      }))
    } else {
      setEditForm(prev => ({
        ...prev,
        authorizedClassIds: prev.authorizedClassIds.includes(classId)
          ? prev.authorizedClassIds.filter(id => id !== classId)
          : [...prev.authorizedClassIds, classId],
      }))
    }
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">加载中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">子账号管理</h2>
        <button
          type="button"
          onClick={() => {
            setCreateForm({ username: "", password: "", nickname: "", authorizedClassIds: [], canRedeem: false })
            setError("")
            setShowCreateModal(true)
          }}
          className="rounded-lg btn-active px-3 py-1 text-xs font-semibold"
        >
          创建子账号
        </button>
      </div>

      <p className="text-xs text-text-tertiary -mt-1">
        创建子账号供班干部或协作老师使用。子账号仅可在授权班级内加分/减分，所有操作记录操作人。可按需开启小卖部兑换权限。
      </p>

      {subAccounts.length === 0 ? (
        <div className="card p-8 border border-gray-100 text-center">
          <p className="text-sm text-text-secondary">暂无子账号</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subAccounts.map(account => (
            <div key={account.id} className="card p-5 border border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-text-primary">{account.nickname}</span>
                    <span className="text-xs text-text-tertiary">@{account.username}</span>
                    {account.canRedeem && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                        可兑换
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {account.authorizedClassIds.length === 0 ? (
                      <span className="text-xs text-text-tertiary">未授权任何班级</span>
                    ) : (
                      account.authorizedClassIds.map(classId => {
                        const className = classes.find(c => c.id === classId)?.name || classId
                        return (
                          <span
                            key={classId}
                            className="rounded-full bg-gray-100 px-2 py-1 text-xs text-text-secondary"
                          >
                            {className}
                          </span>
                        )
                      })
                    )}
                  </div>
                  {account.createdAt ? (
                    <p className="text-xs text-text-tertiary">
                      创建于 {new Date(account.createdAt).toLocaleString("zh-CN")}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(account)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(account)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs text-danger hover:bg-red-50 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建子账号"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-lg btn-active px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "创建中..." : "创建"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              用户名 <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={createForm.username}
              onChange={e => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="登录用的用户名"
            />
            <p className="mt-1 text-xs text-text-tertiary">至少6位，仅支持字母、数字、下划线</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              密码 <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={createForm.password}
              onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="至少6位"
            />
            <p className="mt-1 text-xs text-text-tertiary">至少6位，子账号用此密码登录</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              昵称 <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={createForm.nickname}
              onChange={e => setCreateForm(prev => ({ ...prev, nickname: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="显示名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">授权班级</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {classes.length === 0 ? (
                <p className="text-xs text-text-tertiary">暂无班级</p>
              ) : (
                classes.map(cls => (
                  <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.authorizedClassIds.includes(cls.id)}
                      onChange={() => toggleClass(cls.id, true)}
                      className="rounded"
                    />
                    <span className="text-sm text-text-secondary">{cls.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">权限设置</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.canRedeem}
                onChange={e => setCreateForm(prev => ({ ...prev, canRedeem: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-text-secondary">允许兑换小卖部商品</span>
            </label>
            <p className="mt-1 text-xs text-text-tertiary">勾选后该子账号可在小卖部为学生兑换商品</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑子账号"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleEdit}
              disabled={submitting}
              className="rounded-lg btn-active px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "保存中..." : "保存"}
            </button>
          </>
        }
      >
        {editingAccount ? (
          <div className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">用户名</label>
              <input
                type="text"
                value={editingAccount.username}
                disabled
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-text-tertiary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                昵称 <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={editForm.nickname}
                onChange={e => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="显示名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                密码 <span className="text-xs text-text-tertiary">(留空表示不修改)</span>
              </label>
              <input
                type="password"
                value={editForm.password}
                onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="至少6位"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">授权班级</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {classes.length === 0 ? (
                  <p className="text-xs text-text-tertiary">暂无班级</p>
                ) : (
                  classes.map(cls => (
                    <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.authorizedClassIds.includes(cls.id)}
                        onChange={() => toggleClass(cls.id, false)}
                        className="rounded"
                      />
                      <span className="text-sm text-text-secondary">{cls.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">权限设置</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.canRedeem}
                  onChange={e => setEditForm(prev => ({ ...prev, canRedeem: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-text-secondary">允许兑换小卖部商品</span>
              </label>
              <p className="mt-1 text-xs text-text-tertiary">勾选后该子账号可在小卖部为学生兑换商品</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default SubAccountManager
