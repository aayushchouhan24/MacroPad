// =============================================================================
// EventLog — scrolling list of recent events
// =============================================================================
import { Keyboard, Disc3, Info, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const ICON_MAP = {
  key:     Keyboard,
  encoder: Disc3,
  system:  Info
}

export function EventLog(): JSX.Element {
  const events     = useAppStore((s) => s.eventLog)
  const clearLog   = useAppStore((s) => s.clearEventLog)

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400">Event Log</h3>
        {events.length > 0 && (
          <button
            onClick={clearLog}
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {events.length === 0 ? (
          <p className="text-xs text-slate-600 text-center pt-8">
            No events yet — press a key or turn the encoder
          </p>
        ) : (
          events.map((e) => {
            const Icon = ICON_MAP[e.type]
            return (
              <div
                key={e.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg
                           bg-slate-800/40 animate-slide-in"
              >
                <Icon size={13} className="text-slate-500 shrink-0" />
                <span className="flex-1 text-xs truncate">{e.message}</span>
                <span className="text-[10px] text-slate-600 shrink-0 tabular-nums">
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
