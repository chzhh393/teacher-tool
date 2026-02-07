import type { Student } from "../types"

import type { RedeemRecord, ScoreRecord, ShopItem } from "../types"

export const normalizeStudent = (student: Student & { _id?: string }) => {
  const id = student.id || student._id || ""
  return {
    ...student,
    id,
  } as Student
}

export const normalizeStudents = (students: Array<Student & { _id?: string }>) =>
  students.map(normalizeStudent)

export const normalizeScoreRecords = (records: Array<ScoreRecord & { _id?: string; data?: ScoreRecord }>) =>
  records.map((item) => {
    const record = item.data || item
    return {
      ...record,
      id: record.id || item._id || "",
    }
  })

export const normalizeRedeemRecords = (records: Array<RedeemRecord & { _id?: string }>) =>
  records.map((record) => ({
    ...record,
    id: record.id || record._id || "",
  }))

export const normalizeShopItems = (items: Array<ShopItem & { _id?: string; data?: ShopItem }>) =>
  items.map((item) => {
    const d = item.data || item
    return { ...d, id: d.id || item._id || "" }
  })
