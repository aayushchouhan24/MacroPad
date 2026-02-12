// =============================================================================
// KeyMapper — visual grid + per-key configuration panel + encoder rotation
// =============================================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { KeyConfigPanel } from './KeyConfigPanel'
import { EncoderKnob } from '@/components/dashboard/EncoderKnob'
import * as conn from '@/lib/connection'
import {
  HID_KEY_LABELS,
  MAP_NONE,
  MAP_TEXT_MACRO,
  MAP_MODIFIER_COMBO,
  MAP_LAUNCH_APP,
  ENC_MODE_LABELS,
  ENC_MODE_VOLUME,
  ENC_MODE_SCROLL,
  ENC_MODE_ZOOM,
  ENC_MODE_BRIGHTNESS,
  ENC_MODE_CUSTOM,
  CMD_SET_ENCODER_MODE,
  type EncoderConfig
} from '@/lib/types'
import { NUM_ROWS, NUM_COLS } from '@/lib/constants'
import { Send, RotateCcw } from 'lucide-react'

const ENC_MODES = [
  ENC_MODE_VOLUME,
  ENC_MODE_SCROLL,
  ENC_MODE_ZOOM,
  ENC_MODE_BRIGHTNESS,
  ENC_MODE_CUSTOM
]

const COMMON_KEYS = Object.entries(HID_KEY_LABELS)
  .filter(([c]) => { const n = Number(c); return n >= 0x04 && n <= 0x52 })
  .map(([c, l]) => ({ code: Number(c), label: l }))

export function KeyMapper(): JSX.Element {
  const pressedKeys    = useAppStore((s) => s.pressedKeys)
  const keyMappings    = useAppStore((s) => s.keyMappings)
  const selectedIdx    = useAppStore((s) => s.selectedKeyIndex)
  const setSelected    = useAppStore((s) => s.setSelectedKeyIndex)
  const encoderConfig  = useAppStore((s) => s.encoderConfig)
  const setEncoderConfig = useAppStore((s) => s.setEncoderConfig)
  const connected      = useAppStore((s) => s.connectionStatus === 'connected')

  const [localEncoder, setLocalEncoder] = useState<EncoderConfig>({ ...encoderConfig })

  useEffect(() => {
    setLocalEncoder({ ...encoderConfig })
  }, [encoderConfig])

  function updateEncoder(patch: Partial<EncoderConfig>): void {
    setLocalEncoder((prev) => ({ ...prev, ...patch }))
  }

  async function handleEncoderApply(): Promise<void> {
    setEncoderConfig(localEncoder)
    if (connected) {
      await conn.sendCommand(CMD_SET_ENCODER_MODE, [
        localEncoder.mode,
        localEncoder.cwKeyCode,
        localEncoder.ccwKeyCode,
        localEncoder.cwModifiers,
        localEncoder.ccwModifiers,
        localEncoder.sensitivity,
        localEncoder.btnKeyCode,
        localEncoder.btnModifiers,
        localEncoder.btnMapType
      ])
    }
  }

  function handleEncoderReset(): void {
    const def: EncoderConfig = {
      mode: ENC_MODE_VOLUME,
      cwKeyCode: 0, ccwKeyCode: 0,
      cwModifiers: 0, ccwModifiers: 0,
      sensitivity: 2,
      btnKeyCode: 0, btnModifiers: 0, btnMapType: 0
    }
    setLocalEncoder(def)
    setEncoderConfig(def)
  }

  function keyLabel(idx: number): string {
    // Key 4 is the encoder button
    if (idx === 4) return 'Encoder Btn'
    
    const m = keyMappings[idx]
    if (!m || m.type === MAP_NONE) return `Key ${idx + 1}`
    if (m.type === MAP_TEXT_MACRO) return m.macro?.slice(0, 8) || 'Macro'
    if (m.type === MAP_MODIFIER_COMBO || m.type === 0x05 /* legacy shortcut */) {
      if (m.macro && m.macro.startsWith('[')) {
        try { const a = JSON.parse(m.macro) as unknown[]; return `Macro (${a.length})` } catch { return 'Macro' }
      }
      if (m.macro) return m.macro.slice(0, 10)
      const parts: string[] = []
      if (m.modifiers & 0x01) parts.push('Ctrl')
      if (m.modifiers & 0x02) parts.push('Shift')
      if (m.modifiers & 0x04) parts.push('Alt')
      if (m.modifiers & 0x08) parts.push('Win')
      const kn = HID_KEY_LABELS[m.keyCode]
      if (kn && kn !== 'None') parts.push(kn)
      return parts.join('+').slice(0, 10) || `Key ${idx + 1}`
    }
    if (m.type === MAP_LAUNCH_APP) {
      if (!m.macro) return 'CMD'
      const name = m.macro.replace(/\\/g, '/').split('/').pop() || m.macro
      return name.replace(/\.[a-z]+$/i, '').slice(0, 10)
    }
    return HID_KEY_LABELS[m.keyCode] ?? `0x${m.keyCode.toString(16)}`
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* ── Key Grid & Config Panel ────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Key Grid */}
        <div className="card p-4 sm:p-6 shrink-0">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 sm:mb-4">
            Select a key to configure
          </h2>
          <div className="flex flex-col gap-2 sm:gap-3">
            {Array.from({ length: NUM_ROWS }, (_, r) => (
              <div key={r} className="flex gap-2 sm:gap-3">
                {Array.from({ length: NUM_COLS }, (_, c) => {
                  const idx = r * NUM_COLS + c
                  const pressed = pressedKeys[idx]
                  const selected = selectedIdx === idx
                  const isEncoderBtn = idx === 4
                  return (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setSelected(idx)}
                      className={`key-cap ${pressed ? 'active' : ''} ${selected ? 'selected' : ''} ${isEncoderBtn ? 'ring-2 ring-cyan-500/40' : ''}`}
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

        {/* Config Panel */}
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

      {/* ── Encoder Rotation Configuration ───────────────────────────────── */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-sm font-semibold text-slate-300">Encoder Rotation</h2>
          <div className="flex gap-2">
            <button onClick={handleEncoderReset} className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3">
              <RotateCcw size={13} /> Reset
            </button>
            <button onClick={handleEncoderApply} className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3">
              <Send size={13} /> Apply
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings */}
          <div className="lg:col-span-8 space-y-5">
            {/* Mode */}
            <div>
              <label className="label">Rotation Mode</label>
              <div className="flex flex-wrap gap-2">
                {ENC_MODES.map((m) => (
                  <button
                    key={m}
                    onClick={() => updateEncoder({ mode: m })}
                    className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors
                      ${localEncoder.mode === m
                        ? 'bg-brand-600/30 border-brand-500/50 text-brand-300'
                        : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}
                  >
                    {ENC_MODE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Sensitivity */}
            <div>
              <label className="label">Sensitivity (steps per event): {localEncoder.sensitivity}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={localEncoder.sensitivity}
                onChange={(e) => updateEncoder({ sensitivity: Number(e.target.value) })}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>Fine (1)</span>
                <span>Coarse (10)</span>
              </div>
            </div>

            {/* Custom CW / CCW keys */}
            {localEncoder.mode === ENC_MODE_CUSTOM && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Clockwise Key</label>
                  <select
                    value={localEncoder.cwKeyCode}
                    onChange={(e) => updateEncoder({ cwKeyCode: Number(e.target.value) })}
                    className="input-field"
                  >
                    <option value={0}>Select…</option>
                    {COMMON_KEYS.map((k) => (
                      <option key={k.code} value={k.code}>{k.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Counter-Clockwise Key</label>
                  <select
                    value={localEncoder.ccwKeyCode}
                    onChange={(e) => updateEncoder({ ccwKeyCode: Number(e.target.value) })}
                    className="input-field"
                  >
                    <option value={0}>Select…</option>
                    {COMMON_KEYS.map((k) => (
                      <option key={k.code} value={k.code}>{k.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center gap-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Live Preview
            </h3>
            <EncoderKnob />
            <p className="text-xs text-slate-600">
              Mode: <span className="text-slate-400">{ENC_MODE_LABELS[localEncoder.mode]}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
