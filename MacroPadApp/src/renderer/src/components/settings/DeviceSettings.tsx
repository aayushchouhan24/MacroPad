// =============================================================================
// DeviceSettings — BT name, debounce, sleep, factory reset, app settings
// =============================================================================
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import * as conn from '@/lib/connection'
import {
  CMD_SET_BT_NAME,
  CMD_SET_DEBOUNCE,
  CMD_SET_SLEEP_TIMEOUT,
  CMD_FACTORY_RESET,
  CMD_SAVE_CONFIG
} from '@/lib/types'
import {
  Bluetooth,
  Timer,
  Moon,
  RotateCcw,
  Save,
  AlertTriangle,
  Shield,
  Trash2,
  Send,
  Settings2,
  Power,
  MonitorOff,
  Wifi
} from 'lucide-react'

export function DeviceSettings(): JSX.Element {
  const connected     = useAppStore((s) => s.connectionStatus === 'connected')
  const deviceInfo    = useAppStore((s) => s.deviceInfo)
  const deviceName    = useAppStore((s) => s.deviceName)
  const addNotify     = useAppStore((s) => s.addNotification)

  const [btName, setBtName]       = useState(deviceName ?? 'MacroPad')
  const [debounce, setDebounce]   = useState(20)
  const [sleepMin, setSleepMin]   = useState(5)
  const [resetConfirm, setResetConfirm] = useState(false)

  const [trustedDevices, setTrustedDevices] = useState<{ id: string; name: string }[]>([])

  // App settings
  const [autoConnect, setAutoConnect]       = useState(true)
  const [autoStart, setAutoStart]           = useState(false)
  const [minimizeToTray, setMinimizeToTray] = useState(true)

  useEffect(() => {
    if (deviceName) setBtName(deviceName)
    window.api?.getTrustedDevices().then(setTrustedDevices)
    window.api?.getSettings().then((s) => {
      if (s) {
        setAutoConnect(s.autoConnect as boolean ?? true)
        setAutoStart(s.autoStart as boolean ?? false)
        setMinimizeToTray(s.minimizeToTray as boolean ?? true)
      }
    })
  }, [deviceName])

  async function handleSetName(): Promise<void> {
    if (!connected) return
    const enc = new TextEncoder()
    const bytes = enc.encode(btName)
    await conn.sendCommand(CMD_SET_BT_NAME, [...bytes])
    addNotify({ type: 'info', title: 'Name updated (takes effect after restart)', auto: true })
  }

  async function handleSetDebounce(): Promise<void> {
    if (!connected) return
    await conn.sendCommand(CMD_SET_DEBOUNCE, [(debounce >> 8) & 0xff, debounce & 0xff])
    addNotify({ type: 'success', title: `Debounce set to ${debounce}ms`, auto: true })
  }

  async function handleSetSleep(): Promise<void> {
    if (!connected) return
    const ms = sleepMin * 60 * 1000
    await conn.sendCommand(CMD_SET_SLEEP_TIMEOUT, [
      (ms >> 24) & 0xff, (ms >> 16) & 0xff, (ms >> 8) & 0xff, ms & 0xff
    ])
    addNotify({ type: 'success', title: `Sleep timeout set to ${sleepMin} min`, auto: true })
  }

  async function handleSaveToFlash(): Promise<void> {
    if (!connected) return
    await conn.sendCommand(CMD_SAVE_CONFIG)
    addNotify({ type: 'success', title: 'Config saved to device flash', auto: true })
  }

  async function handleFactoryReset(): Promise<void> {
    if (!connected) return
    await conn.sendCommand(CMD_FACTORY_RESET)
    setResetConfirm(false)
    addNotify({ type: 'warning', title: 'Factory reset — device is restarting', auto: true })
  }

  async function removeTrusted(id: string): Promise<void> {
    const updated = await window.api?.removeTrustedDevice(id)
    if (updated) setTrustedDevices(updated)
  }

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">

      {/* ── Bluetooth Name ──────────────────────────────────────────────── */}
      <Section title="Bluetooth Name" icon={Bluetooth}>
        <div className="flex gap-3">
          <input
            value={btName}
            onChange={(e) => setBtName(e.target.value)}
            maxLength={30}
            className="input-field flex-1"
          />
          <button
            onClick={handleSetName}
            disabled={!connected}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
          >
            <Send size={13} /> Set
          </button>
        </div>
        <p className="text-[11px] text-slate-600 mt-1">Device must restart for name change to take effect.</p>
      </Section>

      {/* ── Debounce ────────────────────────────────────────────────────── */}
      <Section title="Key Debounce" icon={Timer}>
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
      </Section>

      {/* ── Sleep Timeout ───────────────────────────────────────────────── */}
      <Section title="Sleep Timeout" icon={Moon}>
        <label className="label">Idle timeout: {sleepMin} min</label>
        <input
          type="range"
          min={1}
          max={30}
          value={sleepMin}
          onChange={(e) => setSleepMin(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>1 min</span>
          <span>30 min</span>
        </div>
        <button
          onClick={handleSetSleep}
          disabled={!connected}
          className="btn-primary mt-2 disabled:opacity-40"
        >
          Apply
        </button>
      </Section>

      {/* ── Save / Reset ────────────────────────────────────────────────── */}
      <Section title="Device Actions" icon={Save}>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleSaveToFlash}
            disabled={!connected}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
          >
            <Save size={14} /> Save Config to Flash
          </button>

          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              disabled={!connected}
              className="btn-danger flex items-center gap-1.5 disabled:opacity-40"
            >
              <RotateCcw size={14} /> Factory Reset
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/40">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-xs text-red-300">Are you sure? This erases all settings.</span>
              <button onClick={handleFactoryReset} className="btn-danger !py-1 !px-3 text-xs">
                Yes, Reset
              </button>
              <button onClick={() => setResetConfirm(false)} className="btn-secondary !py-1 !px-3 text-xs">
                Cancel
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* ── Device Info ─────────────────────────────────────────────────── */}
      {deviceInfo && (
        <Section title="Device Info" icon={Bluetooth}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Firmware" value={`v${deviceInfo.fwMajor}.${deviceInfo.fwMinor}.${deviceInfo.fwPatch}`} />
            <InfoRow label="Layout" value={`${deviceInfo.rows}×${deviceInfo.cols}`} />
            <InfoRow label="Encoder" value={deviceInfo.hasEncoder ? 'Yes' : 'No'} />
            <InfoRow label="Battery Monitor" value={deviceInfo.hasBattery ? 'Yes' : 'No'} />
          </div>
        </Section>
      )}

      {/* ── App Settings ──────────────────────────────────────────────── */}
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

      {/* ── Trusted Devices ─────────────────────────────────────────────── */}
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

// ── Reusable section wrapper ─────────────────────────────────────────────────
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
