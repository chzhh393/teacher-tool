import { useState } from "react"

export interface ToolDef {
  id: string
  name: string
  icon: React.ReactNode
}

const tools: ToolDef[] = [
  {
    id: "roll-call",
    name: "随机点名",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M22 11h-6" />
      </svg>
    ),
  },
  {
    id: "attendance",
    name: "考勤管理",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "homework",
    name: "作业收集",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
        <path d="m9 10 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "noise-meter",
    name: "静音挑战",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10v3" />
        <path d="M6 6v11" />
        <path d="M10 3v18" />
        <path d="M14 8v7" />
        <path d="M18 5v13" />
        <path d="M22 10v3" />
      </svg>
    ),
  },
]

interface ToolDockProps {
  onSelectTool: (toolId: string) => void
}

const ToolDock = ({ onSelectTool }: ToolDockProps) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-50 hidden md:flex items-center"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Dock 面板 */}
      <div
        className={`flex flex-col gap-2 rounded-l-2xl border border-r-0 border-white/70 bg-white/90 backdrop-blur-lg shadow-modal p-3 transition-all duration-300 ease-in-out ${
          expanded
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary text-center mb-1">
          工具箱
        </p>
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelectTool(tool.id)}
            className="group flex flex-col items-center gap-1 rounded-xl p-2.5 text-text-secondary transition-all hover:bg-primary/10 hover:text-primary hover:scale-110"
            title={tool.name}
          >
            {tool.icon}
            <span className="text-[10px] font-medium leading-tight">{tool.name}</span>
          </button>
        ))}
      </div>

      {/* 触发条 — 始终可见 */}
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-l-lg bg-primary/80 text-white px-1.5 py-4 shadow-md cursor-pointer transition-all duration-300 ${
          expanded ? "opacity-0 w-0 px-0 overflow-hidden" : "opacity-70 hover:opacity-100"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
    </div>
  )
}

export default ToolDock
