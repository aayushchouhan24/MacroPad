// =============================================================================
// ProfileManager — create / rename / duplicate / import / export / sync
// =============================================================================
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import * as conn from '@/lib/connection'
import {
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  Send,
  Pencil,
  Check,
  X,
  Star
} from 'lucide-react'
import {
  defaultProfile,
  CMD_SYNC_PROFILE,
  type Profile,
  type KeyMapping,
  type EncoderConfig
} from '@/lib/types'

export function ProfileManager(): JSX.Element {
  const profiles        = useAppStore((s) => s.profiles)
  const activeId        = useAppStore((s) => s.activeProfileId)
  const setProfiles     = useAppStore((s) => s.setProfiles)
  const addProfile      = useAppStore((s) => s.addProfile)
  const updateProfile   = useAppStore((s) => s.updateProfile)
  const removeProfile   = useAppStore((s) => s.removeProfile)
  const setActiveId     = useAppStore((s) => s.setActiveProfileId)
  const setAllMappings  = useAppStore((s) => s.setAllKeyMappings)
  const setEncoderCfg   = useAppStore((s) => s.setEncoderConfig)
  const keyMappings     = useAppStore((s) => s.keyMappings)
  const encoderConfig   = useAppStore((s) => s.encoderConfig)
  const connected       = useAppStore((s) => s.connectionStatus === 'connected')
  const addNotification = useAppStore((s) => s.addNotification)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName]   = useState('')

  // Load profiles from disk on mount
  useEffect(() => {
    window.api?.getProfiles().then((p: string | any[]) => {
      if (Array.isArray(p) && p.length > 0) setProfiles(p as Profile[])
    })
    window.api?.getActiveProfileId().then((id: string) => {
      if (id) setActiveId(id)
    })
  }, [])

  // Persist profile changes
  function persistProfiles(list: Profile[]): void {
    list.forEach((p) => window.api?.saveProfile(p))
  }

  function handleCreate(): void {
    const p = defaultProfile(`Profile ${profiles.length + 1}`)
    addProfile(p)
    window.api?.saveProfile(p)
  }

  function handleDuplicate(p: Profile): void {
    const dup: Profile = {
      ...structuredClone(p),
      id: crypto.randomUUID(),
      name: `${p.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    addProfile(dup)
    window.api?.saveProfile(dup)
  }

  function handleDelete(id: string): void {
    removeProfile(id)
    window.api?.deleteProfile(id)
  }

  function handleActivate(p: Profile): void {
    setActiveId(p.id)
    window.api?.setActiveProfileId(p.id)
    setAllMappings(p.keyMappings)
    setEncoderCfg(p.encoderConfig)
    addNotification({ type: 'success', title: `Profile "${p.name}" activated`, auto: true })
  }

  function handleSaveCurrentToProfile(p: Profile): void {
    const updated: Profile = {
      ...p,
      keyMappings: [...keyMappings],
      encoderConfig: { ...encoderConfig },
      updatedAt: Date.now()
    }
    updateProfile(updated)
    window.api?.saveProfile(updated)
    addNotification({ type: 'success', title: `Saved to "${p.name}"`, auto: true })
  }

  async function handleSyncToDevice(p: Profile): Promise<void> {
    if (!connected) return
    const enc = new TextEncoder()
    const nameBytes = enc.encode(p.name)
    const data: number[] = [nameBytes.length, ...nameBytes]

    for (const km of p.keyMappings) {
      data.push(km.type, km.keyCode, km.modifiers)
      const macroBytes = km.macro ? enc.encode(km.macro) : new Uint8Array()
      data.push(macroBytes.length, ...macroBytes)
    }

    const ec = p.encoderConfig
    data.push(
      ec.mode, ec.cwKeyCode, ec.ccwKeyCode,
      ec.cwModifiers, ec.ccwModifiers, ec.sensitivity,
      ec.btnKeyCode, ec.btnModifiers, ec.btnMapType
    )

    await conn.sendCommand(CMD_SYNC_PROFILE, data)
    addNotification({ type: 'success', title: 'Profile synced to device', auto: true })
  }

  async function handleExport(p: Profile): Promise<void> {
    const json = await window.api?.exportProfile(p)
    if (json) await navigator.clipboard.writeText(json)
    addNotification({ type: 'info', title: 'Profile JSON copied to clipboard', auto: true })
  }

  async function handleImport(): Promise<void> {
    const text = await navigator.clipboard.readText()
    const result = await window.api?.importProfile(text)
    if (result?.ok && result.profile) {
      const p = result.profile as Profile
      p.id = crypto.randomUUID()
      p.createdAt = Date.now()
      p.updatedAt = Date.now()
      addProfile(p)
      window.api?.saveProfile(p)
      addNotification({ type: 'success', title: `Imported "${p.name}"`, auto: true })
    } else if (result) {
      addNotification({ type: 'error', title: 'Import failed', message: result.error, auto: true })
    }
  }

  function startRename(p: Profile): void {
    setEditingId(p.id)
    setEditName(p.name)
  }

  function confirmRename(p: Profile): void {
    const updated = { ...p, name: editName, updatedAt: Date.now() }
    updateProfile(updated)
    window.api?.saveProfile(updated)
    setEditingId(null)
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-slate-300">Profiles</h2>
        <div className="flex gap-2">
          <button onClick={handleImport} className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3">
            <Upload size={13} /> Import
          </button>
          <button onClick={handleCreate} className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3">
            <Plus size={13} /> New Profile
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {profiles.map((p) => {
          const isActive = activeId === p.id
          const isEditing = editingId === p.id
          return (
            <div
              key={p.id}
              className={`card-sm px-5 py-4 flex items-center gap-4 transition-colors
                ${isActive ? 'border-brand-500/40' : ''}`}
            >
              {/* Star */}
              <button
                onClick={() => handleActivate(p)}
                title="Activate"
                className={isActive ? 'text-brand-400' : 'text-slate-600 hover:text-slate-400'}
              >
                <Star size={16} fill={isActive ? 'currentColor' : 'none'} />
              </button>

              {/* Name */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && confirmRename(p)}
                      className="input-field !py-1 !text-sm max-w-[200px]"
                    />
                    <button onClick={() => confirmRename(p)} className="text-emerald-400">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-600">
                      Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <IconBtn icon={Pencil} title="Rename" onClick={() => startRename(p)} />
                <IconBtn icon={Copy} title="Duplicate" onClick={() => handleDuplicate(p)} />
                <IconBtn icon={Download} title="Export" onClick={() => handleExport(p)} />
                {connected && (
                  <IconBtn icon={Send} title="Sync to device" onClick={() => handleSyncToDevice(p)} />
                )}
                {isActive && (
                  <IconBtn
                    icon={Check}
                    title="Save current config"
                    onClick={() => handleSaveCurrentToProfile(p)}
                    className="text-emerald-400"
                  />
                )}
                {profiles.length > 1 && (
                  <IconBtn icon={Trash2} title="Delete" onClick={() => handleDelete(p.id)}
                    className="text-red-400/60 hover:text-red-400" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function IconBtn({
  icon: Icon,
  title,
  onClick,
  className = ''
}: {
  icon: typeof Plus
  title: string
  onClick: () => void
  className?: string
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-300
                  hover:bg-slate-700/50 transition-colors ${className}`}
    >
      <Icon size={14} />
    </button>
  )
}
