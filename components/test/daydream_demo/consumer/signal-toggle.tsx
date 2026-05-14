'use client'

export function SignalToggle({
  signalOn,
  onSignalChange,
}: {
  signalOn: boolean
  onSignalChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSignalChange(!signalOn)}
      className="fixed left-4 top-[110px] z-50 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/85 px-3 py-1 text-[11.5px] text-zinc-700 shadow-sm backdrop-blur transition-colors hover:bg-white"
    >
      <span
        className={
          'h-1.5 w-1.5 rounded-full transition-colors ' +
          (signalOn ? 'bg-emerald-500' : 'bg-zinc-300')
        }
      />
      <span className="text-zinc-500">Giftly signal:</span>
      <span
        className={
          'font-medium tabular-nums ' +
          (signalOn ? 'text-emerald-700' : 'text-zinc-500')
        }
      >
        {signalOn ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}
