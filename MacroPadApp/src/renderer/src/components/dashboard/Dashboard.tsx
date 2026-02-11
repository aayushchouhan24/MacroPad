// =============================================================================
// Dashboard — Material dark cards: status + key grid + encoder + event log
// =============================================================================
import { KeyGrid } from './KeyGrid'
import { EncoderKnob } from './EncoderKnob'
import { EventLog } from './EventLog'
import { useAppStore } from '@/store/useAppStore'
import {
  Bluetooth,
  BluetoothOff,
  Cpu,
  Battery,
  Zap
} from 'lucide-react'

export function Dashboard(): JSX.Element {
  const status   = useAppStore((s) => s.connectionStatus)
  const info     = useAppStore((s) => s.deviceInfo)
  const battery  = useAppStore((s) => s.batteryLevel)
  const devName  = useAppStore((s) => s.deviceName)

  const connected = status === 'connected'

  return (
    <div className="grid grid-cols-12 gap-4 animate-fade-in">
      {/* ── Status Cards ─────────────────────────────────────────────────── */}
      <div className="col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard
          icon={connected ? Bluetooth : BluetoothOff}
          label="Connection"
          value={connected ? 'Connected' : 'Disconnected'}
          accent={connected ? '#34d399' : '#475569'}
        />
        <StatusCard
          icon={Cpu}
          label="Device"
          value={devName ?? '—'}
          accent="#818cf8"
        />
        <StatusCard
          icon={Battery}
          label="Battery"
          value={connected ? `${battery}%` : '—'}
          accent={battery > 50 ? '#34d399' : battery > 15 ? '#fbbf24' : '#f87171'}
        />
        <StatusCard
          icon={Zap}
          label="Firmware"
          value={info ? `v${info.fwMajor}.${info.fwMinor}.${info.fwPatch}` : '—'}
          accent="#22d3ee"
        />
      </div>

      {/* ── Key Grid + Encoder ───────────────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-8 card p-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Live Input
        </h2>
        <div className="flex flex-wrap items-start gap-8">
          <KeyGrid />
          <EncoderKnob />
        </div>
      </div>

      {/* ── Event Log ────────────────────────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-4 card p-5 max-h-[420px] flex flex-col">
        <EventLog />
      </div>
    </div>
  )
}

// ── Status Card ──────────────────────────────────────────────────────────────
function StatusCard({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: typeof Bluetooth
  label: string
  value: string
  accent: string
}): JSX.Element {
  return (
    <div className="card-sm px-4 py-3.5 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm font-semibold truncate text-slate-200">{value}</p>
      </div>
    </div>
  )
}
