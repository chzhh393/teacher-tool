import { useEffect } from "react"
import { createPortal } from "react-dom"
import NoiseMeter from "./tools/NoiseMeter"
import RollCall from "./tools/RollCall"
import PlaceholderTool from "./tools/PlaceholderTool"

const toolNames: Record<string, string> = {
  "roll-call": "随机点名",
  attendance: "考勤管理",
  homework: "作业收集",
  "noise-meter": "静音挑战",
}

interface ToolOverlayProps {
  toolId: string
  onClose: () => void
}

const ToolOverlay = ({ toolId, onClose }: ToolOverlayProps) => {
  const toolName = toolNames[toolId] || toolId

  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  // 阻止背景滚动
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  const renderTool = () => {
    switch (toolId) {
      case "roll-call":
        return <RollCall />
      case "noise-meter":
        return <NoiseMeter />
      default:
        return <PlaceholderTool name={toolName} />
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-md"
        onClick={onClose}
        aria-label="关闭工具"
      />

      {/* 内容区域 */}
      <div className="relative z-10 w-full max-w-6xl mx-6 max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl bg-white/95 backdrop-blur-lg shadow-modal animate-slide-up overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-text-primary">{toolName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary transition-colors hover:bg-gray-100 hover:text-text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* 工具内容 */}
        <div className="flex-1 overflow-auto p-6">
          {renderTool()}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ToolOverlay
