// =============================================================================
// Dashboard — Material dark cards: status + key grid + encoder + event log
// =============================================================================
import { KeyGrid } from './KeyGrid'
import { EncoderKnob } from './EncoderKnob'
import { EventLog } from './EventLog'
import { SerialMonitor } from '../monitor/SerialMonitor'
import { useAppStore } from '@/store/useAppStore'
import * as conn from '@/lib/connection'
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
  const reconnecting = status === 'reconnecting'
  const isUsb = conn.getActiveTransport() === 'usb'

  return (
    <div className="grid grid-cols-12 gap-3 sm:gap-4 animate-fade-in">
      {/* ── Status Cards ─────────────────────────────────────────────────── */}
      <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatusCard
          icon={connected ? Bluetooth : BluetoothOff}
          label="Connection"
          value={connected ? 'Connected' : reconnecting ? 'Reconnecting…' : 'Disconnected'}
          accent={connected ? '#34d399' : reconnecting ? '#f59e0b' : '#475569'}
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
      <div className="col-span-12 lg:col-span-8 card p-4 sm:p-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 sm:mb-4">
          Live Input
        </h2>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
          <KeyGrid />
          <EncoderKnob />
        </div>
      </div>

      {/* ── Event Log ────────────────────────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-4 card p-4 sm:p-5 max-h-[320px] lg:max-h-[420px] flex flex-col">
        <EventLog />
      </div>

      {/* ── Serial Monitor (always visible) ──────────────────────────────── */}
      <div className="col-span-12 card overflow-hidden" style={{ height: '300px' }}>
        <SerialMonitor />
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
    <div className="card-sm px-3 py-2.5 sm:px-4 sm:py-3.5 flex items-center gap-2.5 sm:gap-3">
      <div
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] sm:text-[10px] text-slate-600 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-xs sm:text-sm font-semibold truncate text-slate-200">{value}</p>
      </div>
    </div>
  )
}
