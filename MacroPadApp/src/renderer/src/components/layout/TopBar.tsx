// =============================================================================
// TopBar — Material dark status bar with connection + battery + controls
// =============================================================================
import {
  Bluetooth,
  BluetoothSearching,
  BluetoothConnected,
  BluetoothOff,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Usb,
  Unplug,
  Clock,
  RefreshCw
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import * as conn from '@/lib/connection'
import { CMD_REQUEST_CONFIG } from '@/lib/types'
import { useState, useEffect } from 'react'

export function TopBar(): JSX.Element {
  const status     = useAppStore((s) => s.connectionStatus)
  const deviceName = useAppStore((s) => s.deviceName)
  const battery    = useAppStore((s) => s.batteryLevel)
  const page       = useAppStore((s) => s.activePage)

  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const pageLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    keymapper: 'Key Mapper',
    encoder: 'Encoder Settings',
    profiles: 'Profiles',
    settings: 'Device Settings'
  }

  const busy = status === 'scanning' || status === 'connecting'

  async function handleBleConnect(): Promise<void> {
    const s = useAppStore.getState()
    s.setConnectionStatus('scanning')
    s.setScanModalOpen(true)
    try {
      const info = await conn.connectBle()
      if (!info) {
        s.setConnectionStatus('disconnected')
        s.setScanModalOpen(false)
        return
      }
      s.setScanModalOpen(false)
      s.setDeviceName(conn.getDeviceName())
      s.setDeviceInfo(info)
      s.setConnectionStatus('connected')
      await conn.sendCommand(CMD_REQUEST_CONFIG)
      const batt = await conn.readBattery()
      s.setBatteryLevel(batt)
    } catch (err) {
      console.error('BLE connection failed:', err)
      s.setScanModalOpen(false)
      s.setConnectionStatus('disconnected')
      s.addNotification({ type: 'error', title: 'BLE Connection Failed', message: String(err), auto: true })
    }
  }

  async function handleUsbConnect(): Promise<void> {
    const s = useAppStore.getState()
    s.setConnectionStatus('connecting')
    try {
      const info = await conn.connectUsb()
      if (!info) {
        s.setConnectionStatus('disconnected')
        return
      }
      s.setDeviceName(conn.getDeviceName())
      s.setDeviceInfo(info)
      s.setConnectionStatus('connected')
      await conn.sendCommand(CMD_REQUEST_CONFIG)
      const batt = await conn.readBattery()
      s.setBatteryLevel(batt)
    } catch (err) {
      console.error('USB connection failed:', err)
      s.setConnectionStatus('disconnected')
      s.addNotification({ type: 'error', title: 'USB Connection Failed', message: String(err), auto: true })
    }
  }

  function handleDisconnect(): void {
    conn.disconnect()
  }

  const BatteryIcon =
    battery > 50 ? Battery : battery > 15 ? BatteryCharging : BatteryWarning
  const batteryColor =
    battery > 50 ? 'text-emerald-400' : battery > 15 ? 'text-amber-400' : 'text-red-400'

  const transport = conn.getActiveTransport()

  return (
    <header className="h-14 flex items-center justify-between px-5
                        border-b border-border bg-[#080b12]/80 backdrop-blur-sm shrink-0">
      {/* Left: page title + clock */}
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-slate-200">
          {pageLabels[page] ?? ''}
        </h1>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Clock size={13} />
          <span className="text-xs font-mono tabular-nums">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Right: status + controls */}
      <div className="flex items-center gap-3">
        {/* Battery */}
        {status === 'connected' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-border">
            <BatteryIcon size={14} className={batteryColor} />
            <span className={`text-xs font-medium tabular-nums ${batteryColor}`}>{battery}%</span>
          </div>
        )}

        {/* Device name + transport badge */}
        {status === 'connected' && deviceName && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-border">
            {transport === 'usb' ? <Usb size={12} className="text-cyan-400" /> : <Bluetooth size={12} className="text-blue-400" />}
            <span className="text-xs text-slate-400">{deviceName}</span>
          </div>
        )}

        {/* Connected → Disconnect button */}
        {status === 'connected' ? (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-white/5 hover:bg-white/10 border border-border
                       text-slate-300 text-xs font-medium transition-all duration-200"
          >
            <Unplug size={13} />
            Disconnect
          </button>
        ) : status === 'reconnecting' ? (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30
                       text-amber-300 text-xs font-medium transition-all duration-200"
          >
            <RefreshCw size={13} className="animate-spin" />
            Reconnecting…
          </button>
        ) : (
          /* Disconnected → BT + USB connect buttons side by side */
          <div className="flex items-center gap-2">
            <button
              onClick={handleBleConnect}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-brand-600 hover:bg-brand-500 disabled:opacity-50
                         text-white text-xs font-medium transition-all duration-200
                         shadow-lg shadow-brand-600/20"
            >
              {status === 'scanning' ? (
                <><BluetoothSearching size={13} className="animate-pulse" /> Scanning…</>
              ) : status === 'connecting' ? (
                <><BluetoothConnected size={13} className="animate-pulse" /> Connecting…</>
              ) : (
                <><BluetoothOff size={13} /> BT</>
              )}
            </button>

            {conn.isSerialSupported() && (
              <button
                onClick={handleUsbConnect}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50
                           text-white text-xs font-medium transition-all duration-200
                           shadow-lg shadow-cyan-700/20"
              >
                <Usb size={13} />
                USB
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
