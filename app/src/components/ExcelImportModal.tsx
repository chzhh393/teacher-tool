import { useCallback, useRef, useState } from "react"

import Modal from "./Modal"
import { extractNames, parseExcelFile } from "../utils/excelParse"
import type { ExcelParseResult } from "../utils/excelParse"

type Step = "upload" | "select" | "confirm"

interface ExcelImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (names: string[]) => Promise<void>
  loading?: boolean
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const STEP_DESC: Record<Step, string> = {
  upload: "选择 Excel 文件（.xlsx / .xls）",
  select: "选择包含学生姓名的列",
  confirm: "确认导入的学生名单",
}

const ExcelImportModal = ({ open, onClose, onImport, loading }: ExcelImportModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null)
  const [selectedColumn, setSelectedColumn] = useState(-1)
  const [names, setNames] = useState<string[]>([])
  const [removedDuplicates, setRemovedDuplicates] = useState(0)
  const [error, setError] = useState("")

  const reset = useCallback(() => {
    setStep("upload")
    setFileName("")
    setParseResult(null)
    setSelectedColumn(-1)
    setNames([])
    setRemovedDuplicates(0)
    setError("")
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  // Step 1: 处理文件
  const processFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError("文件过大，请选择 5MB 以内的文件")
      return
    }
    setError("")
    try {
      const result = await parseExcelFile(file)
      if (result.rows.length === 0) {
        setError("文件没有数据行")
        return
      }
      setFileName(file.name)
      setParseResult(result)
      setSelectedColumn(result.autoDetectedColumnIndex >= 0 ? result.autoDetectedColumnIndex : 0)
      setStep("select")
    } catch (err) {
      setError(err instanceof Error ? err.message : "文件解析失败")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // 重置 input 以便重复选择同一文件
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // Step 2 → Step 3
  const handleColumnConfirm = () => {
    if (!parseResult) return
    const extracted = extractNames(parseResult.rows, selectedColumn)
    const totalNonEmpty = parseResult.rows.filter(
      (row) => String(row[selectedColumn] ?? "").trim() !== ""
    ).length
    setNames(extracted)
    setRemovedDuplicates(totalNonEmpty - extracted.length)
    setStep("confirm")
  }

  // Step 3: 确认导入
  const handleImportConfirm = async () => {
    await onImport(names)
  }

  // 渲染 footer
  const renderFooter = () => {
    if (step === "upload") {
      return (
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-text-secondary"
        >
          取消
        </button>
      )
    }
    if (step === "select") {
      return (
        <>
          <button
            type="button"
            onClick={() => { reset(); }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-text-secondary"
          >
            返回
          </button>
          <button
            type="button"
            onClick={handleColumnConfirm}
            className="rounded-lg btn-active px-4 py-2 text-sm font-semibold"
          >
            下一步
          </button>
        </>
      )
    }
    // confirm
    return (
      <>
        <button
          type="button"
          onClick={() => setStep("select")}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-text-secondary"
        >
          返回
        </button>
        <button
          type="button"
          onClick={handleImportConfirm}
          disabled={loading || names.length === 0}
          className="rounded-lg btn-active px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "导入中..." : `确认导入 ${names.length} 名学生`}
        </button>
      </>
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Excel 导入学生"
      description={STEP_DESC[step]}
      footer={renderFooter()}
    >
      {/* Step 1: 上传 */}
      {step === "upload" && (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-sm text-text-secondary transition-colors hover:border-primary hover:bg-primary/5"
          >
            <span className="text-3xl">📄</span>
            <span>点击选择或拖拽 Excel 文件到此处</span>
            <span className="text-xs text-text-tertiary">支持 .xlsx、.xls 格式，最大 5MB</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          {error && (
            <p className="mt-3 rounded-xl border border-red-100 bg-red-50/60 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Step 2: 选列 */}
      {step === "select" && parseResult && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-text-secondary">文件：{fileName}</span>
            <span className="text-text-tertiary">共 {parseResult.rows.length} 行数据</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-text-primary">姓名所在列：</label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(Number(e.target.value))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              {parseResult.headers.map((header, i) => (
                <option key={i} value={i}>
                  {header || `第 ${i + 1} 列`}
                </option>
              ))}
            </select>
            {parseResult.autoDetectedColumnIndex >= 0 && selectedColumn === parseResult.autoDetectedColumnIndex && (
              <span className="text-xs text-emerald-600">已自动识别</span>
            )}
          </div>

          {/* 预览表格 */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {parseResult.headers.map((header, i) => (
                    <th
                      key={i}
                      className={`whitespace-nowrap px-3 py-2 text-left font-semibold ${
                        i === selectedColumn ? "bg-primary/10 text-primary" : "text-text-secondary"
                      }`}
                    >
                      {header || `列 ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.rows.slice(0, 5).map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-50">
                    {parseResult.headers.map((_, ci) => (
                      <td
                        key={ci}
                        className={`whitespace-nowrap px-3 py-1.5 ${
                          ci === selectedColumn ? "bg-primary/5 font-medium text-text-primary" : "text-text-secondary"
                        }`}
                      >
                        {row[ci] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parseResult.rows.length > 5 && (
              <p className="px-3 py-2 text-xs text-text-tertiary">... 还有 {parseResult.rows.length - 5} 行</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: 确认 */}
      {step === "confirm" && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            即将导入 <span className="font-semibold text-text-primary">{names.length}</span> 名学生
          </p>
          {removedDuplicates > 0 && (
            <p className="text-xs text-amber-600">已自动去除 {removedDuplicates} 个重复姓名</p>
          )}
          <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex flex-wrap gap-2">
              {names.map((name, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-white px-3 py-1.5 text-sm text-text-primary shadow-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default ExcelImportModal
