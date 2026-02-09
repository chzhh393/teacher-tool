import { type ReactNode } from "react"
import { createPortal } from "react-dom"

interface ModalProps {
  open: boolean
  title?: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

const Modal = ({ open, title, description, onClose, children, footer }: ModalProps) => {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in md:items-center md:px-4 md:py-8">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="关闭弹窗"
      />
      <div className="relative z-10 flex w-full max-h-[85vh] flex-col rounded-t-2xl border border-white/70 bg-white/90 p-4 shadow-modal backdrop-blur card-enter md:max-w-5xl md:max-h-[calc(100vh-4rem)] md:rounded-2xl md:p-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 md:hidden" />
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            {title ? <h3 className="text-xl font-bold text-text-primary">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        <div className="mt-6 min-h-0 overflow-y-auto">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4 shrink-0">{footer}</div> : null}
      </div>
    </div>,
    document.body
  )
}

export default Modal
