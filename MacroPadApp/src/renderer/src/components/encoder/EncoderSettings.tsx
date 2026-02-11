// =============================================================================
// EncoderSettings — mode picker, sensitivity, button mapping
// =============================================================================
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { EncoderKnob } from '@/components/dashboard/EncoderKnob'
import * as ble from '@/lib/bleApi'
import {
  ENC_MODE_LABELS,
  ENC_MODE_VOLUME,
  ENC_MODE_SCROLL,
  ENC_MODE_ZOOM,
  ENC_MODE_BRIGHTNESS,
  ENC_MODE_CUSTOM,
  MAP_TYPE_LABELS,
  MAP_NONE,
  MAP_SINGLE_KEY,
  MAP_MEDIA_KEY,
  HID_KEY_LABELS,
  CMD_SET_ENCODER_MODE,
  type EncoderConfig
} from '@/lib/types'
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

export function EncoderSettings(): JSX.Element {
  const config     = useAppStore((s) => s.encoderConfig)
  const setConfig  = useAppStore((s) => s.setEncoderConfig)
  const connected  = useAppStore((s) => s.connectionStatus === 'connected')

  const [local, setLocal] = useState<EncoderConfig>({ ...config })

  useEffect(() => {
    setLocal({ ...config })
  }, [config])

  function update(patch: Partial<EncoderConfig>): void {
    setLocal((prev) => ({ ...prev, ...patch }))
  }

  async function handleApply(): Promise<void> {
    setConfig(local)
    if (connected) {
      await ble.sendCommand(CMD_SET_ENCODER_MODE, [
        local.mode,
        local.cwKeyCode,
        local.ccwKeyCode,
        local.cwModifiers,
        local.ccwModifiers,
        local.sensitivity,
        local.btnKeyCode,
        local.btnModifiers,
        local.btnMapType
      ])
    }
  }

  function handleReset(): void {
    const def: EncoderConfig = {
      mode: ENC_MODE_VOLUME,
      cwKeyCode: 0, ccwKeyCode: 0,
      cwModifiers: 0, ccwModifiers: 0,
      sensitivity: 2,
      btnKeyCode: 0, btnModifiers: 0, btnMapType: MAP_NONE
    }
    setLocal(def)
    setConfig(def)
  }

  return (
    <div className="grid grid-cols-12 gap-6 animate-fade-in">
      {/* ── Left: settings ───────────────────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-8 card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Encoder Configuration</h2>
          <div className="flex gap-2">
            <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3">
              <RotateCcw size={13} /> Reset
            </button>
            <button onClick={handleApply} className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3">
              <Send size={13} /> Apply
            </button>
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="label">Rotation Mode</label>
          <div className="flex flex-wrap gap-2">
            {ENC_MODES.map((m) => (
              <button
                key={m}
                onClick={() => update({ mode: m })}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors
                  ${local.mode === m
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
          <label className="label">Sensitivity (steps per event): {local.sensitivity}</label>
          <input
            type="range"
            min={1}
            max={10}
            value={local.sensitivity}
            onChange={(e) => update({ sensitivity: Number(e.target.value) })}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>Fine (1)</span>
            <span>Coarse (10)</span>
          </div>
        </div>

        {/* Custom CW / CCW keys */}
        {local.mode === ENC_MODE_CUSTOM && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Clockwise Key</label>
              <select
                value={local.cwKeyCode}
                onChange={(e) => update({ cwKeyCode: Number(e.target.value) })}
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
                value={local.ccwKeyCode}
                onChange={(e) => update({ ccwKeyCode: Number(e.target.value) })}
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

        {/* Encoder Button */}
        <div>
          <label className="label">Button Action</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label text-[10px]">Type</label>
              <select
                value={local.btnMapType}
                onChange={(e) => update({ btnMapType: Number(e.target.value) })}
                className="input-field"
              >
                {[MAP_NONE, MAP_SINGLE_KEY, MAP_MEDIA_KEY].map((t) => (
                  <option key={t} value={t}>{MAP_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {local.btnMapType !== MAP_NONE && (
              <div>
                <label className="label text-[10px]">Key</label>
                <select
                  value={local.btnKeyCode}
                  onChange={(e) => update({ btnKeyCode: Number(e.target.value) })}
                  className="input-field"
                >
                  <option value={0}>Select…</option>
                  {COMMON_KEYS.map((k) => (
                    <option key={k.code} value={k.code}>{k.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: live preview ──────────────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-4 card p-6 flex flex-col items-center justify-center gap-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Live Preview
        </h3>
        <EncoderKnob />
        <p className="text-xs text-slate-600">
          Mode: <span className="text-slate-400">{ENC_MODE_LABELS[local.mode]}</span>
        </p>
      </div>
    </div>
  )
}
