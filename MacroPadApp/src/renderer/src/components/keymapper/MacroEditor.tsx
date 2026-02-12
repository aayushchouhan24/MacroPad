// =============================================================================
// MacroEditor — timeline-based macro sequence editor
// Record keyboard shortcuts (including Win key), add delays, mouse clicks,
// launch apps, run commands, type text, and loop actions.
// =============================================================================
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Clock, Keyboard, Mouse, ExternalLink, Terminal, Type, Repeat,
  ArrowDown, ArrowUp, Copy, Trash2, Circle, X, RotateCcw, FolderOpen, Search
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MacroAction {
  id: string
  type: 'delay' | 'key-down' | 'key-up' | 'mouse-down' | 'mouse-up'
      | 'launch' | 'command' | 'text' | 'loop-start' | 'loop-end'
  delayMs?: number
  key?: string
  vk?: number
  button?: 'left' | 'right' | 'middle'
  path?: string
  command?: string
  text?: string
  count?: number
}

// ── VK key catalogue (for manual key picker) ─────────────────────────────────

const VK_KEYS: { label: string; vk: number }[] = [
  // Modifiers
  { label: 'Ctrl (L)', vk: 0xa2 }, { label: 'Ctrl (R)', vk: 0xa3 },
  { label: 'Shift (L)', vk: 0xa0 }, { label: 'Shift (R)', vk: 0xa1 },
  { label: 'Alt (L)', vk: 0xa4 }, { label: 'Alt (R)', vk: 0xa5 },
  { label: 'Windows', vk: 0x5b }, { label: 'Win (R)', vk: 0x5c },
  // Letters
  ...Array.from({ length: 26 }, (_, i) => ({
    label: String.fromCharCode(65 + i), vk: 0x41 + i
  })),
  // Digits
  ...Array.from({ length: 10 }, (_, i) => ({
    label: `${i}`, vk: 0x30 + i
  })),
  // Function keys
  ...Array.from({ length: 12 }, (_, i) => ({
    label: `F${i + 1}`, vk: 0x70 + i
  })),
  // Control
  { label: 'Enter', vk: 0x0d }, { label: 'Escape', vk: 0x1b },
  { label: 'Backspace', vk: 0x08 }, { label: 'Tab', vk: 0x09 },
  { label: 'Space', vk: 0x20 }, { label: 'CapsLock', vk: 0x14 },
  { label: 'Delete', vk: 0x2e }, { label: 'Insert', vk: 0x2d },
  // Navigation
  { label: 'Home', vk: 0x24 }, { label: 'End', vk: 0x23 },
  { label: 'PageUp', vk: 0x21 }, { label: 'PageDown', vk: 0x22 },
  { label: 'Up', vk: 0x26 }, { label: 'Down', vk: 0x28 },
  { label: 'Left', vk: 0x25 }, { label: 'Right', vk: 0x27 },
  // System
  { label: 'PrtSc', vk: 0x2c }, { label: 'ScrLk', vk: 0x91 },
  { label: 'Pause', vk: 0x13 },
  // Punctuation
  { label: '-', vk: 0xbd }, { label: '=', vk: 0xbb },
  { label: '[', vk: 0xdb }, { label: ']', vk: 0xdd },
  { label: '\\', vk: 0xdc }, { label: ';', vk: 0xba },
  { label: "'", vk: 0xde }, { label: '`', vk: 0xc0 },
  { label: ',', vk: 0xbc }, { label: '.', vk: 0xbe },
  { label: '/', vk: 0xbf },
  // Media
  { label: 'Vol Up', vk: 0xaf }, { label: 'Vol Down', vk: 0xae },
  { label: 'Mute', vk: 0xad }, { label: 'Play/Pause', vk: 0xb3 },
  { label: 'Next', vk: 0xb0 }, { label: 'Prev', vk: 0xb1 },
]

// ── DOM KeyboardEvent.code → VK (for recording) ─────────────────────────────

const DOM_TO_VK: Record<string, { vk: number; label: string }> = {
  // Modifiers (captured during recording — Win key works here!)
  ControlLeft:  { vk: 0xa2, label: 'Ctrl (L)' },
  ControlRight: { vk: 0xa3, label: 'Ctrl (R)' },
  ShiftLeft:    { vk: 0xa0, label: 'Shift (L)' },
  ShiftRight:   { vk: 0xa1, label: 'Shift (R)' },
  AltLeft:      { vk: 0xa4, label: 'Alt (L)' },
  AltRight:     { vk: 0xa5, label: 'Alt (R)' },
  MetaLeft:     { vk: 0x5b, label: 'Windows' },
  MetaRight:    { vk: 0x5c, label: 'Win (R)' },
  // Letters
  ...Object.fromEntries(
    Array.from({ length: 26 }, (_, i) => [
      `Key${String.fromCharCode(65 + i)}`,
      { vk: 0x41 + i, label: String.fromCharCode(65 + i) }
    ])
  ),
  // Digits
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      `Digit${i}`, { vk: 0x30 + i, label: `${i}` }
    ])
  ),
  // Function keys
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [
      `F${i + 1}`, { vk: 0x70 + i, label: `F${i + 1}` }
    ])
  ),
  // Control
  Enter:     { vk: 0x0d, label: 'Enter' },
  Escape:    { vk: 0x1b, label: 'Escape' },
  Backspace: { vk: 0x08, label: 'Backspace' },
  Tab:       { vk: 0x09, label: 'Tab' },
  Space:     { vk: 0x20, label: 'Space' },
  CapsLock:  { vk: 0x14, label: 'CapsLock' },
  Delete:    { vk: 0x2e, label: 'Delete' },
  Insert:    { vk: 0x2d, label: 'Insert' },
  // Navigation
  Home:       { vk: 0x24, label: 'Home' },
  End:        { vk: 0x23, label: 'End' },
  PageUp:     { vk: 0x21, label: 'PageUp' },
  PageDown:   { vk: 0x22, label: 'PageDown' },
  ArrowUp:    { vk: 0x26, label: 'Up' },
  ArrowDown:  { vk: 0x28, label: 'Down' },
  ArrowLeft:  { vk: 0x25, label: 'Left' },
  ArrowRight: { vk: 0x27, label: 'Right' },
  // System
  PrintScreen: { vk: 0x2c, label: 'PrtSc' },
  ScrollLock:  { vk: 0x91, label: 'ScrLk' },
  Pause:       { vk: 0x13, label: 'Pause' },
  // Punctuation
  Minus:        { vk: 0xbd, label: '-' },
  Equal:        { vk: 0xbb, label: '=' },
  BracketLeft:  { vk: 0xdb, label: '[' },
  BracketRight: { vk: 0xdd, label: ']' },
  Backslash:    { vk: 0xdc, label: '\\' },
  Semicolon:    { vk: 0xba, label: ';' },
  Quote:        { vk: 0xde, label: "'" },
  Backquote:    { vk: 0xc0, label: '`' },
  Comma:        { vk: 0xbc, label: ',' },
  Period:       { vk: 0xbe, label: '.' },
  Slash:        { vk: 0xbf, label: '/' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 10) }

function fmtMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(3)}s`
}

function actionSummary(a: MacroAction): string {
  switch (a.type) {
    case 'delay':      return fmtMs(a.delayMs || 0)
    case 'key-down':   return a.key || '?'
    case 'key-up':     return a.key || '?'
    case 'mouse-down': return `${(a.button || 'left')} Click`
    case 'mouse-up':   return `${(a.button || 'left')} Click`
    case 'launch':     return a.path || 'Program or Website'
    case 'command':    return a.command || 'Insert Command'
    case 'text':       return `Text: ${a.text || '...'}`
    case 'loop-start': return `Start Loop: ${a.count || 1}`
    case 'loop-end':   return 'End Loop'
  }
}

// ── Sidebar items ────────────────────────────────────────────────────────────

const SIDEBAR = [
  { id: 'delay',    icon: Clock,        label: 'Delay',       color: 'text-yellow-400' },
  { id: 'keyboard', icon: Keyboard,     label: 'Keyboard',    color: 'text-green-400' },
  { id: 'mouse',    icon: Mouse,        label: 'Mouse',       color: 'text-purple-400' },
  { id: 'launch',   icon: ExternalLink, label: 'Launch',      color: 'text-pink-400' },
  { id: 'command',  icon: Terminal,      label: 'Run Command', color: 'text-blue-400' },
  { id: 'text',     icon: Type,         label: 'Text',        color: 'text-teal-400' },
  { id: 'loop',     icon: Repeat,       label: 'Loop',        color: 'text-orange-400' },
] as const

// ═════════════════════════════════════════════════════════════════════════════
// MacroEditor
// ═════════════════════════════════════════════════════════════════════════════

interface MacroEditorProps {
  actions: MacroAction[]
  onChange: (actions: MacroAction[]) => void
}

export function MacroEditor({ actions, onChange }: MacroEditorProps): JSX.Element {
  const [recording, setRecording] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addPanel, setAddPanel] = useState<string | null>(null)

  // Refs for recording (avoid stale closures)
  const actionsRef = useRef(actions)
  const lastTimeRef = useRef(Date.now())
  useEffect(() => { actionsRef.current = actions }, [actions])

  // Total duration
  const totalMs = useMemo(
    () => actions.reduce((s, a) => s + (a.type === 'delay' ? (a.delayMs || 0) : 0), 0),
    [actions]
  )

  // ── Recording (captures ALL keys including Win/Ctrl/Alt/Shift) ─────────
  useEffect(() => {
    if (!recording) return
    lastTimeRef.current = Date.now()

    const emit = (type: 'key-down' | 'key-up', vk: number, label: string): void => {
      const now = Date.now()
      const dt = now - lastTimeRef.current
      lastTimeRef.current = now
      const next = [...actionsRef.current]
      if (dt > 5) next.push({ id: uid(), type: 'delay', delayMs: Math.round(dt) })
      next.push({ id: uid(), type, key: label, vk })
      actionsRef.current = next
      onChange(next)
    }

    const onDown = (e: KeyboardEvent): void => {
      e.preventDefault(); e.stopPropagation()
      if (e.repeat) return
      const info = DOM_TO_VK[e.code]
      if (info) emit('key-down', info.vk, info.label)
    }

    const onUp = (e: KeyboardEvent): void => {
      e.preventDefault(); e.stopPropagation()
      const info = DOM_TO_VK[e.code]
      if (info) emit('key-up', info.vk, info.label)
    }

    window.addEventListener('keydown', onDown, true)
    window.addEventListener('keyup', onUp, true)
    return () => {
      window.removeEventListener('keydown', onDown, true)
      window.removeEventListener('keyup', onUp, true)
    }
  }, [recording, onChange])

  // ── Action helpers ─────────────────────────────────────────────────────
  const add = (a: MacroAction): void => { onChange([...actions, a]); setAddPanel(null) }
  const remove = (id: string): void => {
    onChange(actions.filter(a => a.id !== id))
    if (selectedId === id) setSelectedId(null)
  }
  const duplicate = (id: string): void => {
    const i = actions.findIndex(a => a.id === id)
    if (i < 0) return
    const next = [...actions]
    next.splice(i + 1, 0, { ...actions[i], id: uid() })
    onChange(next)
  }
  const patch = (id: string, p: Partial<MacroAction>): void => {
    onChange(actions.map(a => a.id === id ? { ...a, ...p } : a))
  }

  // ── Sidebar click handlers ─────────────────────────────────────────────
  const onSidebarClick = (id: string): void => {
    switch (id) {
      case 'delay':   add({ id: uid(), type: 'delay', delayMs: 100 }); break
      case 'launch':  add({ id: uid(), type: 'launch', path: '' }); break
      case 'command': add({ id: uid(), type: 'command', command: '' }); break
      case 'text':    add({ id: uid(), type: 'text', text: '' }); break
      case 'loop': {
        onChange([...actions,
          { id: uid(), type: 'loop-start', count: 1 },
          { id: uid(), type: 'loop-end' }
        ])
        setAddPanel(null)
        break
      }
      default: setAddPanel(addPanel === id ? null : id); break
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-3" style={{ minHeight: 340 }}>
      {/* ── Left sidebar ────────────────────────────────────────── */}
      <div className="w-[140px] shrink-0 border-r border-border pr-3">
        <p className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider mb-2">Add</p>
        <div className="space-y-0.5">
          {SIDEBAR.map(({ id, icon: Icon, label, color }) => (
            <button
              key={id}
              onClick={() => onSidebarClick(id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors text-left
                ${addPanel === id
                  ? 'bg-brand-600/15 border border-brand-500/30'
                  : 'border border-transparent hover:bg-white/[0.04]'}`}
            >
              <Icon size={15} className={color} />
              <span className="text-slate-300 font-medium uppercase text-[10px] tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
          <Clock size={13} className="text-slate-500" />
          <span className="text-xs text-slate-500 font-mono">{fmtMs(totalMs)}</span>
          <div className="flex-1" />
          <button
            onClick={() => setRecording(!recording)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors
              ${recording
                ? 'bg-red-600/30 border-red-500/50 text-red-300 animate-pulse'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-600'}`}
          >
            <Circle size={8} fill={recording ? 'currentColor' : 'none'} />
            {recording ? 'Stop' : 'Record'}
          </button>
          <button
            onClick={() => { onChange([]); setSelectedId(null) }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RotateCcw size={12} /> Clear
          </button>
        </div>

        {/* Add panels (keyboard / mouse pickers) */}
        {addPanel === 'keyboard' && (
          <KeyPickerPanel
            onAdd={(vk, label, dir) => add({
              id: uid(), type: dir === 'down' ? 'key-down' : 'key-up', key: label, vk
            })}
            onClose={() => setAddPanel(null)}
          />
        )}
        {addPanel === 'mouse' && (
          <MousePickerPanel
            onAdd={(button, dir) => add({
              id: uid(), type: dir === 'down' ? 'mouse-down' : 'mouse-up', button
            })}
            onClose={() => setAddPanel(null)}
          />
        )}

        {/* Action list */}
        <div className="flex-1 overflow-y-auto space-y-[2px] pr-1">
          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 py-10">
              <p className="text-sm mb-1">No actions yet</p>
              <p className="text-[11px]">Add from the sidebar or click Record</p>
            </div>
          ) : (
            actions.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                selected={selectedId === action.id}
                onSelect={() => setSelectedId(selectedId === action.id ? null : action.id)}
                onUpdate={(p) => patch(action.id, p)}
                onDelete={() => remove(action.id)}
                onDuplicate={() => duplicate(action.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ActionRow
// ═════════════════════════════════════════════════════════════════════════════

const TYPE_ICON: Record<string, { icon: typeof Clock; color: string }> = {
  'delay':      { icon: Clock,        color: 'text-yellow-400' },
  'key-down':   { icon: Keyboard,     color: 'text-green-400' },
  'key-up':     { icon: Keyboard,     color: 'text-slate-400' },
  'mouse-down': { icon: Mouse,        color: 'text-purple-400' },
  'mouse-up':   { icon: Mouse,        color: 'text-purple-400' },
  'launch':     { icon: ExternalLink, color: 'text-pink-400' },
  'command':    { icon: Terminal,      color: 'text-blue-400' },
  'text':       { icon: Type,         color: 'text-teal-400' },
  'loop-start': { icon: Repeat,       color: 'text-orange-400' },
  'loop-end':   { icon: Repeat,       color: 'text-orange-400' },
}

function ActionRow({ action, selected, onSelect, onUpdate, onDelete, onDuplicate }: {
  action: MacroAction
  selected: boolean
  onSelect: () => void
  onUpdate: (p: Partial<MacroAction>) => void
  onDelete: () => void
  onDuplicate: () => void
}): JSX.Element {
  const cfg = TYPE_ICON[action.type] || TYPE_ICON['delay']
  const Icon = cfg.icon
  const isDown = action.type === 'key-down' || action.type === 'mouse-down'
  const isUp   = action.type === 'key-up'   || action.type === 'mouse-up'

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group transition-colors
        ${selected
          ? 'bg-brand-600/10 border border-brand-500/30'
          : 'border border-transparent hover:bg-white/[0.03]'}`}
    >
      <Icon size={14} className={cfg.color} />
      {isDown && <ArrowDown size={12} className="text-green-400 shrink-0" />}
      {isUp   && <ArrowUp   size={12} className="text-slate-500 shrink-0" />}

      {/* Content — inline editing when selected */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <InlineEdit action={action} onUpdate={onUpdate} />
        ) : (
          <span className="text-xs text-slate-300 truncate block">{actionSummary(action)}</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate() }}
          className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300"
          title="Duplicate"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// InlineEdit — shows edit controls based on action type
// ═════════════════════════════════════════════════════════════════════════════

function InlineEdit({ action, onUpdate }: {
  action: MacroAction
  onUpdate: (p: Partial<MacroAction>) => void
}): JSX.Element {
  const stop = (e: React.MouseEvent): void => e.stopPropagation()

  switch (action.type) {
    case 'delay':
      return (
        <div className="flex items-center gap-1" onClick={stop}>
          <input
            type="number" min={0} step={10}
            value={action.delayMs || 0}
            onChange={(e) => onUpdate({ delayMs: Math.max(0, Number(e.target.value)) })}
            className="w-20 bg-slate-800/80 border border-slate-700/50 rounded px-1.5 py-0.5 text-xs text-slate-300 font-mono"
          />
          <span className="text-[10px] text-slate-500">ms</span>
        </div>
      )

    case 'command':
      return (
        <input
          type="text"
          value={action.command || ''}
          onChange={(e) => onUpdate({ command: e.target.value })}
          onClick={stop}
          placeholder="Enter command..."
          className="w-full bg-slate-800/80 border border-slate-700/50 rounded px-1.5 py-0.5 text-xs text-slate-300 font-mono"
        />
      )

    case 'text':
      return (
        <input
          type="text"
          value={action.text || ''}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onClick={stop}
          placeholder="Enter text..."
          className="w-full bg-slate-800/80 border border-slate-700/50 rounded px-1.5 py-0.5 text-xs text-slate-300 font-mono"
        />
      )

    case 'launch':
      return (
        <div className="flex items-center gap-1" onClick={stop}>
          <input
            type="text"
            value={action.path || ''}
            onChange={(e) => onUpdate({ path: e.target.value })}
            placeholder="Path or URL..."
            className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded px-1.5 py-0.5 text-xs text-slate-300 font-mono"
          />
          <button
            onClick={async () => {
              const p = await window.api?.browseForFile()
              if (p) onUpdate({ path: p })
            }}
            className="shrink-0 p-0.5 text-slate-500 hover:text-slate-300"
          >
            <FolderOpen size={12} />
          </button>
        </div>
      )

    case 'loop-start':
      return (
        <div className="flex items-center gap-1" onClick={stop}>
          <span className="text-xs text-slate-400">Loop ×</span>
          <input
            type="number" min={1} max={999}
            value={action.count || 1}
            onChange={(e) => onUpdate({ count: Math.max(1, Number(e.target.value)) })}
            className="w-14 bg-slate-800/80 border border-slate-700/50 rounded px-1.5 py-0.5 text-xs text-slate-300 font-mono"
          />
        </div>
      )

    default:
      return <span className="text-xs text-slate-300 truncate">{actionSummary(action)}</span>
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// KeyPickerPanel — searchable key grid for manual add
// ═════════════════════════════════════════════════════════════════════════════

function KeyPickerPanel({ onAdd, onClose }: {
  onAdd: (vk: number, label: string, dir: 'down' | 'up') => void
  onClose: () => void
}): JSX.Element {
  const [search, setSearch] = useState('')
  const [dir, setDir] = useState<'down' | 'up'>('down')

  const filtered = VK_KEYS.filter(k =>
    k.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="mb-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700/40 animate-slide-in">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1 bg-slate-800/80 border border-slate-700/50 rounded text-xs text-slate-300"
            autoFocus
          />
        </div>
        <div className="flex rounded-md overflow-hidden border border-slate-700/40">
          <button
            onClick={() => setDir('down')}
            className={`px-2 py-1 text-[10px] font-medium transition-colors
              ${dir === 'down' ? 'bg-green-600/30 text-green-300' : 'bg-slate-800/60 text-slate-500'}`}
          >
            ↓ Down
          </button>
          <button
            onClick={() => setDir('up')}
            className={`px-2 py-1 text-[10px] font-medium transition-colors
              ${dir === 'up' ? 'bg-slate-600/30 text-slate-300' : 'bg-slate-800/60 text-slate-500'}`}
          >
            ↑ Up
          </button>
        </div>
        <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-300">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1 max-h-28 overflow-y-auto">
        {filtered.map((k) => (
          <button
            key={k.vk}
            onClick={() => onAdd(k.vk, k.label, dir)}
            className="px-1 py-1 text-[10px] rounded bg-slate-800/60 border border-slate-700/40
                       text-slate-400 hover:text-slate-200 hover:border-brand-500/40 hover:bg-brand-600/10
                       transition-colors truncate"
            title={k.label}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MousePickerPanel
// ═════════════════════════════════════════════════════════════════════════════

function MousePickerPanel({ onAdd, onClose }: {
  onAdd: (button: 'left' | 'right' | 'middle', dir: 'down' | 'up') => void
  onClose: () => void
}): JSX.Element {
  const [dir, setDir] = useState<'down' | 'up'>('down')

  return (
    <div className="mb-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700/40 animate-slide-in">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-slate-400 font-medium">Mouse Button</span>
        <div className="flex-1" />
        <div className="flex rounded-md overflow-hidden border border-slate-700/40">
          <button
            onClick={() => setDir('down')}
            className={`px-2 py-1 text-[10px] font-medium transition-colors
              ${dir === 'down' ? 'bg-green-600/30 text-green-300' : 'bg-slate-800/60 text-slate-500'}`}
          >
            ↓ Down
          </button>
          <button
            onClick={() => setDir('up')}
            className={`px-2 py-1 text-[10px] font-medium transition-colors
              ${dir === 'up' ? 'bg-slate-600/30 text-slate-300' : 'bg-slate-800/60 text-slate-500'}`}
          >
            ↑ Up
          </button>
        </div>
        <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-300">
          <X size={14} />
        </button>
      </div>
      <div className="flex gap-2">
        {(['left', 'right', 'middle'] as const).map((btn) => (
          <button
            key={btn}
            onClick={() => onAdd(btn, dir)}
            className="flex-1 px-3 py-2 rounded-md text-xs font-medium border capitalize
                       bg-slate-800/60 border-slate-700/40 text-slate-400
                       hover:text-slate-200 hover:border-brand-500/40 hover:bg-brand-600/10
                       transition-colors"
          >
            {btn} Click
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Utilities for parsing/serializing macro actions ──────────────────────────

export function parseMacroActions(macroStr: string): MacroAction[] {
  try {
    if (macroStr && macroStr.startsWith('[')) {
      return JSON.parse(macroStr) as MacroAction[]
    }
  } catch { /* ignore */ }
  return []
}

export function stringifyMacroActions(actions: MacroAction[]): string {
  return actions.length > 0 ? JSON.stringify(actions) : ''
}
