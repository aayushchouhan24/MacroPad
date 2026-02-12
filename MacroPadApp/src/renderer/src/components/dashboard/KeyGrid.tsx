// =============================================================================
// KeyGrid — 2×5 animated key grid
// =============================================================================
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { HID_KEY_LABELS, MAP_NONE, MAP_TEXT_MACRO, MAP_MODIFIER_COMBO, MAP_LAUNCH_APP } from '@/lib/types'
import { NUM_ROWS, NUM_COLS } from '@/lib/constants'

export function KeyGrid(): JSX.Element {
  const pressedKeys  = useAppStore((s) => s.pressedKeys)
  const keyMappings  = useAppStore((s) => s.keyMappings)

  // Key 4 (5th key, 0-indexed) is the encoder button - don't show it in the grid
  const ENCODER_BTN_INDEX = 4

  function keyLabel(idx: number): string {
    const m = keyMappings[idx]
    if (!m || m.type === MAP_NONE) return `${idx + 1}`
    if (m.type === MAP_TEXT_MACRO) return m.macro?.slice(0, 6) || 'Macro'
    if (m.type === MAP_MODIFIER_COMBO || m.type === 0x05 /* legacy shortcut */) {
      if (m.macro && m.macro.startsWith('[')) {
        try { const a = JSON.parse(m.macro) as unknown[]; return `M(${a.length})` } catch { return 'Macro' }
      }
      if (m.macro) return m.macro.slice(0, 8)
      const parts: string[] = []
      if (m.modifiers & 0x01) parts.push('Ctrl')
      if (m.modifiers & 0x02) parts.push('Shift')
      if (m.modifiers & 0x04) parts.push('Alt')
      if (m.modifiers & 0x08) parts.push('Win')
      const kn = HID_KEY_LABELS[m.keyCode]
      if (kn && kn !== 'None') parts.push(kn)
      return parts.join('+').slice(0, 8) || `${idx + 1}`
    }
    if (m.type === MAP_LAUNCH_APP) {
      if (!m.macro) return 'CMD'
      const name = m.macro.replace(/\\/g, '/').split('/').pop() || m.macro
      return name.replace(/\.[a-z]+$/i, '').slice(0, 8)
    }
    return HID_KEY_LABELS[m.keyCode] ?? `0x${m.keyCode.toString(16)}`
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-2.5">
      {Array.from({ length: NUM_ROWS }, (_, r) => (
        <div key={r} className="flex gap-2 sm:gap-2.5">
          {Array.from({ length: NUM_COLS }, (_, c) => {
            const idx = r * NUM_COLS + c
            // Skip encoder button (key 4)
            if (idx === ENCODER_BTN_INDEX) return null
            const pressed = pressedKeys[idx]
            return (
              <motion.div
                key={idx}
                animate={{
                  scale: pressed ? 0.9 : 1,
                  backgroundColor: pressed
                    ? 'rgba(99, 102, 241, 0.35)'  // brand-600/35
                    : 'rgb(14, 18, 27)'            // #0e121b
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`key-cap ${pressed ? 'active' : ''}`}
              >
                <span className="text-[11px] leading-tight text-center">
                  {keyLabel(idx)}
                </span>
              </motion.div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
