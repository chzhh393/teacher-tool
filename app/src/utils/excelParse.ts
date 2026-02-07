import * as XLSX from "xlsx"

export interface ExcelParseResult {
  headers: string[]
  rows: string[][]
  autoDetectedColumnIndex: number
}

const NAME_KEYWORDS = ["姓名", "名字", "学生姓名", "学生", "name", "student name"]

function detectNameColumn(headers: string[]): number {
  // 1. 精确匹配
  for (let i = 0; i < headers.length; i++) {
    const normalized = headers[i].toLowerCase().trim()
    if (NAME_KEYWORDS.includes(normalized)) return i
  }
  // 2. 包含匹配
  for (let i = 0; i < headers.length; i++) {
    const normalized = headers[i].toLowerCase().trim()
    for (const keyword of NAME_KEYWORDS) {
      if (normalized.includes(keyword)) return i
    }
  }
  return -1
}

export function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const aoa: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          raw: false,
        })

        if (aoa.length === 0) {
          resolve({ headers: [], rows: [], autoDetectedColumnIndex: -1 })
          return
        }

        const headers = aoa[0].map((h) => String(h).trim())
        const rows = aoa.slice(1).filter((row) => row.some((cell) => String(cell).trim() !== ""))
        const autoDetectedColumnIndex = detectNameColumn(headers)

        resolve({ headers, rows, autoDetectedColumnIndex })
      } catch {
        reject(new Error("文件格式无法识别，请确认是 Excel 文件"))
      }
    }
    reader.onerror = () => reject(new Error("文件读取失败"))
    reader.readAsArrayBuffer(file)
  })
}

export function extractNames(rows: string[][], columnIndex: number): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const row of rows) {
    const value = String(row[columnIndex] ?? "").trim()
    if (value && !seen.has(value)) {
      seen.add(value)
      names.push(value)
    }
  }
  return names
}
