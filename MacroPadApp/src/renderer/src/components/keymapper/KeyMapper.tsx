// =============================================================================
// KeyMapper — visual grid + per-key configuration panel
// =============================================================================
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { KeyConfigPanel } from './KeyConfigPanel'
import { HID_KEY_LABELS, MAP_NONE, MAP_TEXT_MACRO, MAP_LAUNCH_APP } from '@/lib/types'
import { NUM_ROWS, NUM_COLS } from '@/lib/constants'

export function KeyMapper(): JSX.Element {
  const pressedKeys    = useAppStore((s) => s.pressedKeys)
  const keyMappings    = useAppStore((s) => s.keyMappings)
  const selectedIdx    = useAppStore((s) => s.selectedKeyIndex)
  const setSelected    = useAppStore((s) => s.setSelectedKeyIndex)

  function keyLabel(idx: number): string {
    const m = keyMappings[idx]
    if (!m || m.type === MAP_NONE) return `Key ${idx + 1}`
    if (m.type === MAP_TEXT_MACRO) return m.macro?.slice(0, 8) || 'Macro'
    if (m.type === MAP_LAUNCH_APP) {
      if (!m.macro) return 'App'
      const name = m.macro.replace(/\\/g, '/').split('/').pop() || m.macro
      return name.replace(/\.[a-z]+$/i, '').slice(0, 10)
    }
    return HID_KEY_LABELS[m.keyCode] ?? `0x${m.keyCode.toString(16)}`
  }

  return (
    <div className="flex gap-6 animate-fade-in">
      {/* ── Key Grid ─────────────────────────────────────────────────────── */}
      <div className="card p-6 shrink-0">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Select a key to configure
        </h2>
        <div className="flex flex-col gap-3">
          {Array.from({ length: NUM_ROWS }, (_, r) => (
            <div key={r} className="flex gap-3">
              {Array.from({ length: NUM_COLS }, (_, c) => {
                const idx = r * NUM_COLS + c
                const pressed = pressedKeys[idx]
                const selected = selectedIdx === idx
                return (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setSelected(idx)}
                    className={`key-cap ${pressed ? 'active' : ''} ${selected ? 'selected' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] text-slate-500">
                        R{r + 1}C{c + 1}
                      </span>
                      <span className="text-[11px] font-semibold">{keyLabel(idx)}</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Config Panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {selectedIdx !== null ? (
          <KeyConfigPanel keyIndex={selectedIdx} />
        ) : (
          <div className="card p-8 flex items-center justify-center h-full">
            <p className="text-sm text-slate-500">
              Click a key on the left to configure it
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
