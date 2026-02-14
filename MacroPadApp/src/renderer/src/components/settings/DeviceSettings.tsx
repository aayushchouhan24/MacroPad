// =============================================================================
// DeviceSettings - debounce (live only), app settings, device info
// The ESP stores NOTHING.  All config lives on the PC.
// =============================================================================
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import * as conn from '@/lib/connection'
import { CMD_SET_DEBOUNCE } from '@/lib/types'
import {
  Bluetooth,
  Timer,
  Shield,
  Trash2,
  Send,
  Settings2,
  Power,
  MonitorOff,
  Wifi,
  Info
} from 'lucide-react'

export function DeviceSettings(): JSX.Element {
  const connected     = useAppStore((s) => s.connectionStatus === 'connected')
  const deviceInfo    = useAppStore((s) => s.deviceInfo)
  const deviceName    = useAppStore((s) => s.deviceName)
  const addNotify     = useAppStore((s) => s.addNotification)

  const [debounce, setDebounce] = useState(20)

  const [trustedDevices, setTrustedDevices] = useState<{ id: string; name: string }[]>([])

  // App settings
  const [autoConnect, setAutoConnect]       = useState(true)
  const [autoStart, setAutoStart]           = useState(false)
  const [minimizeToTray, setMinimizeToTray] = useState(true)

  useEffect(() => {
    window.api?.getTrustedDevices().then(setTrustedDevices)
    window.api?.getSettings().then((s) => {
      if (s) {
        setAutoConnect(s.autoConnect as boolean ?? true)
        setAutoStart(s.autoStart as boolean ?? false)
        setMinimizeToTray(s.minimizeToTray as boolean ?? true)
      }
    })
  }, [deviceName])

  async function handleSetDebounce(): Promise<void> {
    if (!connected) return
    await conn.sendCommand(CMD_SET_DEBOUNCE, [(debounce >> 8) & 0xff, debounce & 0xff])
    addNotify({ type: 'success', title: `Debounce set to ${debounce}ms (live, resets on reboot)`, auto: true })
  }

  async function removeTrusted(id: string): Promise<void> {
    const updated = await window.api?.removeTrustedDevice(id)
    if (updated) setTrustedDevices(updated)
  }

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">

      {/* -- Note about storage architecture -- */}
      <Section title="Storage Info" icon={Info}>
        <p className="text-xs text-slate-400 leading-relaxed">
          All configuration (key mappings, profiles, encoder settings) is stored
          <strong className="text-slate-300"> only on this PC</strong>.
          The MacroPad device stores nothing - it only sends raw button and
          encoder events.  Your profiles are auto-saved and backed up locally.
        </p>
      </Section>

      {/* -- Debounce (live, not persisted on device) -- */}
      <Section title="Key Debounce (Live)" icon={Timer}>
        <label className="label">Debounce: {debounce} ms</label>
        <input
          type="range"
          min={5}
          max={100}
          value={debounce}
          onChange={(e) => setDebounce(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>5 ms (fast)</span>
          <span>100 ms (stable)</span>
        </div>
        <button
          onClick={handleSetDebounce}
          disabled={!connected}
          className="btn-primary mt-2 disabled:opacity-40"
        >
          Apply
        </button>
        <p className="text-[11px] text-slate-600 mt-1">
          This is a temporary adjustment - resets to default on device reboot.
        </p>
      </Section>

      {/* -- Device Info -- */}
      {deviceInfo && (
        <Section title="Device Info" icon={Bluetooth}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Firmware" value={`v${deviceInfo.fwMajor}.${deviceInfo.fwMinor}.${deviceInfo.fwPatch}`} />
            <InfoRow label="Layout" value={`${deviceInfo.rows}x${deviceInfo.cols}`} />
            <InfoRow label="Encoder" value={deviceInfo.hasEncoder ? 'Yes' : 'No'} />
            <InfoRow label="Battery Monitor" value={deviceInfo.hasBattery ? 'Yes' : 'No'} />
            {deviceName && <InfoRow label="Device Name" value={deviceName} />}
          </div>
        </Section>
      )}

      {/* -- App Settings -- */}
      <Section title="App Settings" icon={Settings2}>
        <div className="space-y-3">
          <ToggleRow
            icon={Wifi}
            label="Auto-Connect"
            description="Automatically reconnect to last known device on startup"
            checked={autoConnect}
            onChange={(v) => {
              setAutoConnect(v)
              window.api?.getSettings().then((s) =>
                window.api?.saveSettings({ ...s, autoConnect: v })
              )
            }}
          />
          <ToggleRow
            icon={Power}
            label="Start with Windows"
            description="Launch the app automatically when you log in"
            checked={autoStart}
            onChange={(v) => {
              setAutoStart(v)
              window.api?.getSettings().then((s) =>
                window.api?.saveSettings({ ...s, autoStart: v })
              )
            }}
          />
          <ToggleRow
            icon={MonitorOff}
            label="Minimize to Tray"
            description="Hide to system tray instead of closing the app"
            checked={minimizeToTray}
            onChange={(v) => {
              setMinimizeToTray(v)
              window.api?.getSettings().then((s) =>
                window.api?.saveSettings({ ...s, minimizeToTray: v })
              )
            }}
          />
        </div>
      </Section>

      {/* -- Trusted Devices -- */}
      <Section title="Trusted Devices" icon={Shield}>
        {trustedDevices.length === 0 ? (
          <p className="text-xs text-slate-600">No trusted devices saved.</p>
        ) : (
          <div className="space-y-2">
            {trustedDevices.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/40">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-[10px] text-slate-600">{d.id}</p>
                </div>
                <button
                  onClick={() => removeTrusted(d.id)}
                  className="text-red-400/60 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

// -- Reusable section wrapper --
function Section({
  title,
  icon: Icon,
  children
}: {
  title: string
  icon: typeof Bluetooth
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        <Icon size={15} className="text-brand-400" /> {title}
      </h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <span className="text-[11px] text-slate-500">{label}</span>
      <p className="font-medium text-slate-200">{value}</p>
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange
}: {
  icon: typeof Bluetooth
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.02] border border-border">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-slate-500" />
        <div>
          <p className="text-sm font-medium text-slate-300">{label}</p>
          <p className="text-[11px] text-slate-600">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200
          ${checked ? 'bg-brand-600' : 'bg-white/10'}`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm
            transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}