// =============================================================================
// KeyConfigPanel — per-key mapping editor (saved on PC only)
// =============================================================================
import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import {
  MAP_NONE,
  MAP_SINGLE_KEY,
  MAP_MEDIA_KEY,
  MAP_MODIFIER_COMBO,
  MAP_TEXT_MACRO,
  MAP_LAUNCH_APP,
  MAP_TYPE_LABELS,
  HID_KEY_LABELS,
  type KeyMapping
} from '@/lib/types'
import { Save, RotateCcw, FolderOpen } from 'lucide-react'
import { MacroEditor, parseMacroActions, stringifyMacroActions } from './MacroEditor'

const MAP_TYPES = [
  MAP_NONE,
  MAP_SINGLE_KEY,
  MAP_MEDIA_KEY,
  MAP_MODIFIER_COMBO,
  MAP_TEXT_MACRO,
  MAP_LAUNCH_APP
]

const MEDIA_KEYS = [
  { code: 0xe9, label: 'Vol Up' },
  { code: 0xe8, label: 'Vol Down' },
  { code: 0xea, label: 'Mute' },
  { code: 0xcd, label: 'Play / Pause' },
  { code: 0xb5, label: 'Next Track' },
  { code: 0xb6, label: 'Prev Track' },
  { code: 0xb7, label: 'Stop' }
]

const COMMON_KEYS = Object.entries(HID_KEY_LABELS)
  .filter(([c]) => {
    const n = Number(c)
    return n >= 0x04 && n <= 0x52
  })
  .map(([c, l]) => ({ code: Number(c), label: l }))

interface Props {
  keyIndex: number
}

export function KeyConfigPanel({ keyIndex }: Props): JSX.Element {
  const mapping    = useAppStore((s) => s.keyMappings[keyIndex])
  const setMapping = useAppStore((s) => s.setKeyMapping)

  const [local, setLocal] = useState<KeyMapping>({ ...mapping })

  useEffect(() => {
    setLocal({ ...mapping })
  }, [keyIndex, mapping])

  const update = useCallback(
    (patch: Partial<KeyMapping>) => setLocal((prev) => ({ ...prev, ...patch })),
    []
  )

  function handleApply(): void {
    setMapping(keyIndex, local)
    // Config saved to PC store only — ESP doesn't store anything
  }

  function handleReset(): void {
    const empty: KeyMapping = { type: MAP_NONE, keyCode: 0, modifiers: 0, macro: '' }
    setLocal(empty)
    setMapping(keyIndex, empty)
  }

  return (
    <div className="card p-6 animate-slide-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-slate-300">
          Key {keyIndex + 1} Configuration
        </h2>
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3">
            <RotateCcw size={13} /> Reset
          </button>
          <button onClick={handleApply} className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3">
            <Save size={13} /> Save
          </button>
        </div>
      </div>

      {/* Mapping type */}
      <div className="mb-4">
        <label className="label">Action Type</label>
        <div className="flex flex-wrap gap-2">
          {MAP_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => update({ type: t, keyCode: 0, modifiers: 0, macro: '' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${local.type === t
                  ? 'bg-brand-600/30 border-brand-500/50 text-brand-300'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}
            >
              {MAP_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Type-specific editor ────────────────────────────────────────── */}
      {local.type === MAP_SINGLE_KEY && (
        <div>
          <label className="label">Key</label>
          <select
            value={local.keyCode}
            onChange={(e) => update({ keyCode: Number(e.target.value) })}
            className="input-field"
          >
            <option value={0}>Select a key…</option>
            {COMMON_KEYS.map((k) => (
              <option key={k.code} value={k.code}>{k.label}</option>
            ))}
          </select>
        </div>
      )}

      {local.type === MAP_MEDIA_KEY && (
        <div>
          <label className="label">Media Key</label>
          <select
            value={local.keyCode}
            onChange={(e) => update({ keyCode: Number(e.target.value) })}
            className="input-field"
          >
            <option value={0}>Select…</option>
            {MEDIA_KEYS.map((k) => (
              <option key={k.code} value={k.code}>{k.label}</option>
            ))}
          </select>
        </div>
      )}

      {local.type === MAP_MODIFIER_COMBO && (
        <div>
          <label className="label">Macro Sequence</label>
          <MacroEditor
            actions={parseMacroActions(local.macro)}
            onChange={(acts) => update({ macro: stringifyMacroActions(acts), keyCode: 0, modifiers: 0 })}
          />
        </div>
      )}

      {local.type === MAP_TEXT_MACRO && (
        <div>
          <label className="label">Macro Text (max 32 chars)</label>
          <input
            type="text"
            maxLength={32}
            value={local.macro}
            onChange={(e) => update({ macro: e.target.value })}
            placeholder="Type macro text…"
            className="input-field font-mono"
          />
          <p className="text-[11px] text-slate-600 mt-1">
            {local.macro.length}/32 characters
          </p>
        </div>
      )}

      {local.type === MAP_LAUNCH_APP && (
        <div>
          <label className="label">Command</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={local.macro}
              onChange={(e) => update({ macro: e.target.value })}
              placeholder="e.g. notepad.exe, cmd /c dir, shutdown /s /t 0"
              className="input-field font-mono flex-1"
            />
            <button
              type="button"
              onClick={async () => {
                const path = await window.api?.browseForFile()
                if (path) update({ macro: path })
              }}
              className="btn-secondary flex items-center gap-1.5 shrink-0"
            >
              <FolderOpen size={14} /> Browse
            </button>
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            Run any command, open an app, or execute a script.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              { label: 'Notepad', cmd: 'notepad.exe' },
              { label: 'Calculator', cmd: 'calc.exe' },
              { label: 'Explorer', cmd: 'explorer.exe' },
              { label: 'Task Manager', cmd: 'taskmgr.exe' },
              { label: 'CMD', cmd: 'cmd.exe' },
              { label: 'PowerShell', cmd: 'powershell.exe' },
              { label: 'Snip & Sketch', cmd: 'ms-screenclip:' },
              { label: 'Settings', cmd: 'ms-settings:' }
            ].map((q) => (
              <button
                key={q.cmd}
                type="button"
                onClick={() => update({ macro: q.cmd })}
                className="px-2 py-1 rounded-md text-[10px] font-medium
                           bg-white/5 border border-border text-slate-500
                           hover:text-slate-300 hover:border-border-hover transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {local.type === MAP_NONE && (
        <p className="text-sm text-slate-600 py-4">
          This key has no action assigned. Select a type above.
        </p>
      )}
    </div>
  )
}
