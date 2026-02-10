import { useCallback, useEffect, useState } from "react"
import { CloudApi } from "../services/cloudApi"
import { useClassStore } from "../stores/classStore"
import Modal from "./Modal"
import type { Group, Student } from "../types"
import { normalizeGroups, normalizeStudents } from "../utils/normalize"

const PRESET_COLORS = [
  "#FF6B35", "#F7C948", "#38B2AC", "#6366F1",
  "#EC4899", "#8B5CF6", "#10B981", "#3B82F6",
]

interface EditingGroup {
  id: string
  name: string
  color: string
  memberIds: string[]
}

const GroupManager = () => {
  const { classId } = useClassStore()
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  // Modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<EditingGroup | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    try {
      const [groupRes, studentRes] = await Promise.all([
        CloudApi.groupList({ classId }),
        CloudApi.studentList({ classId }),
      ])
      setGroups(normalizeGroups(groupRes.groups || []))
      setStudents(normalizeStudents(studentRes.students || []))
      setDirty(false)
    } catch (err) {
      console.error("加载分组数据失败:", err)
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 已分组的学生 ID 集合
  const assignedStudentIds = new Set(groups.flatMap((g) => g.memberIds))

  // 未分组学生
  const unassignedStudents = students.filter((s) => !assignedStudentIds.has(s.id))

  const handleAddGroup = () => {
    setEditingGroup({
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: "",
      color: PRESET_COLORS[groups.length % PRESET_COLORS.length],
      memberIds: [],
    })
    setError("")
    setShowEditModal(true)
  }

  const handleEditGroup = (group: Group) => {
    setEditingGroup({
      id: group.id,
      name: group.name,
      color: group.color || PRESET_COLORS[0],
      memberIds: [...group.memberIds],
    })
    setError("")
    setShowEditModal(true)
  }

  const handleSaveGroup = () => {
    if (!editingGroup) return
    if (!editingGroup.name.trim()) {
      setError("请输入小组名称")
      return
    }

    const isNew = !groups.find((g) => g.id === editingGroup.id)
    if (isNew) {
      setGroups((prev) => [
        ...prev,
        {
          id: editingGroup.id,
          classId: classId || "",
          name: editingGroup.name.trim(),
          color: editingGroup.color,
          memberIds: editingGroup.memberIds,
          order: prev.length,
        },
      ])
    } else {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id
            ? { ...g, name: editingGroup.name.trim(), color: editingGroup.color, memberIds: editingGroup.memberIds }
            : g
        )
      )
    }
    setDirty(true)
    setShowEditModal(false)
    setEditingGroup(null)
  }

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
    setDirty(true)
    setDeleteConfirmId(null)
  }

  const toggleMember = (studentId: string) => {
    if (!editingGroup) return
    setEditingGroup((prev) => {
      if (!prev) return prev
      const has = prev.memberIds.includes(studentId)
      return {
        ...prev,
        memberIds: has
          ? prev.memberIds.filter((id) => id !== studentId)
          : [...prev.memberIds, studentId],
      }
    })
  }

  // 在编辑 modal 中，可选的学生 = 未分组学生 + 当前编辑小组的成员
  // 需要排除当前编辑小组后再计算已分组 ID，否则反选成员时会从列表消失
  const otherGroupAssignedIds = editingGroup
    ? new Set(
        groups
          .filter((g) => g.id !== editingGroup.id)
          .flatMap((g) => g.memberIds)
      )
    : assignedStudentIds
  const availableStudents = editingGroup
    ? students.filter((s) => !otherGroupAssignedIds.has(s.id))
    : []

  const handleSaveAll = async () => {
    if (!classId) return
    setSaving(true)
    setError("")
    setNotice("")
    try {
      await CloudApi.groupSave({ classId, groups })
      setDirty(false)
      setNotice("分组已保存")
      setTimeout(() => setNotice(""), 2500)
    } catch (err: any) {
      setError(err?.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">加载中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">分组管理</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddGroup}
            className="rounded-lg border border-primary/30 px-3 py-1 text-xs font-semibold text-primary"
          >
            + 新建小组
          </button>
          {dirty && (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="rounded-lg btn-active px-3 py-1 text-xs font-semibold disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存分组"}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-text-tertiary -mt-1">
        将学生分组进行积分PK。小组积分 = 成员累计积分之和，可在光荣榜查看小组排名。
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card p-8 border border-gray-100 text-center">
          <p className="text-sm text-text-secondary">暂无小组，点击「+ 新建小组」开始分组</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const members = group.memberIds
              .map((id) => students.find((s) => s.id === id))
              .filter(Boolean) as Student[]
            const totalScore = members.reduce((sum, m) => sum + (m.earnedScore || 0), 0)
            return (
              <div key={group.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: group.color || PRESET_COLORS[0] }}
                    />
                    <span className="font-semibold text-text-primary">{group.name}</span>
                    <span className="text-xs text-text-tertiary">
                      {members.length}人 · 总积分 {totalScore}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditGroup(group)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(group.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs text-danger hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
                {members.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {members.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-secondary"
                      >
                        {m.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {unassignedStudents.length > 0 && groups.length > 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-text-tertiary">
            未分组学生 ({unassignedStudents.length}人)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unassignedStudents.map((s) => (
              <span key={s.id} className="rounded-full bg-white px-2 py-0.5 text-xs text-text-tertiary">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 编辑/新建小组 Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editingGroup && groups.find((g) => g.id === editingGroup.id) ? "编辑小组" : "新建小组"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveGroup}
              className="rounded-lg btn-active px-4 py-2 text-sm font-semibold"
            >
              确定
            </button>
          </>
        }
      >
        {editingGroup && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">小组名称</label>
              <input
                type="text"
                value={editingGroup.name}
                onChange={(e) => setEditingGroup((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                placeholder="例如：猛虎队"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">颜色标识</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditingGroup((prev) => prev ? { ...prev, color } : prev)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      editingGroup.color === color ? "border-gray-800 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                选择成员 ({editingGroup.memberIds.length}人)
              </label>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3">
                {availableStudents.length === 0 ? (
                  <p className="text-xs text-text-tertiary py-2 text-center">
                    {students.length === 0 ? "暂无学生，请先在学生管理中添加" : "所有学生已分配到其他小组"}
                  </p>
                ) : (
                  availableStudents.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-white">
                      <input
                        type="checkbox"
                        checked={editingGroup.memberIds.includes(s.id)}
                        onChange={() => toggleMember(s.id)}
                        className="rounded"
                      />
                      <span className="text-sm text-text-secondary">{s.name}</span>
                      <span className="text-xs text-text-tertiary ml-auto">积分 {s.earnedScore || 0}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 删除确认 Modal */}
      <Modal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="删除小组"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => deleteConfirmId && handleDeleteGroup(deleteConfirmId)}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-danger hover:bg-red-100"
            >
              确认删除
            </button>
          </>
        }
      >
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-3 text-sm text-danger">
          删除小组后，组内学生将变为未分组状态。保存后生效。
        </div>
      </Modal>
    </div>
  )
}

export default GroupManager
