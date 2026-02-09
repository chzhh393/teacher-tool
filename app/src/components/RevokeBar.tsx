interface RevokeBarProps {
  message: string
  onRevoke: () => void
}

const RevokeBar = ({ message, onRevoke }: RevokeBarProps) => {
  return (
    <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/70 bg-white/85 px-5 py-3 text-sm shadow-soft backdrop-blur md:bottom-6">
      <div className="flex items-center gap-4">
        <span className="text-text-secondary">{message}</span>
        <button
          type="button"
          onClick={onRevoke}
          className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-danger"
        >
          撤回
        </button>
      </div>
    </div>
  )
}

export default RevokeBar
