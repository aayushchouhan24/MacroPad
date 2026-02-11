// =============================================================================
// TopBar — Material dark status bar with connection + battery + controls
// =============================================================================
import {
  BluetoothSearching,
  BluetoothConnected,
  BluetoothOff,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Unplug,
  Clock
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import * as ble from '@/lib/bleApi'
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

  async function handleConnect(): Promise<void> {
    useAppStore.getState().setConnectionStatus('scanning')
    useAppStore.getState().setScanModalOpen(true)
    const dev = await ble.requestDevice()
    if (!dev) {
      useAppStore.getState().setConnectionStatus('disconnected')
      useAppStore.getState().setScanModalOpen(false)
      return
    }
    useAppStore.getState().setConnectionStatus('connecting')
    useAppStore.getState().setScanModalOpen(false)
    try {
      const info = await ble.connect()
      useAppStore.getState().setDeviceName(ble.getDeviceName())
      useAppStore.getState().setDeviceInfo(info)
      useAppStore.getState().setConnectionStatus('connected')
      await ble.sendCommand(CMD_REQUEST_CONFIG)
      const batt = await ble.readBattery()
      useAppStore.getState().setBatteryLevel(batt)
    } catch (err) {
      console.error('Connection failed:', err)
      useAppStore.getState().setConnectionStatus('disconnected')
      useAppStore.getState().addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: String(err),
        auto: true
      })
    }
  }

  function handleDisconnect(): void {
    ble.disconnect()
  }

  const BatteryIcon =
    battery > 50 ? Battery : battery > 15 ? BatteryCharging : BatteryWarning
  const batteryColor =
    battery > 50 ? 'text-emerald-400' : battery > 15 ? 'text-amber-400' : 'text-red-400'

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

        {/* Device name */}
        {status === 'connected' && deviceName && (
          <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-border">
            <span className="text-xs text-slate-400">{deviceName}</span>
          </div>
        )}

        {/* Connect / Disconnect */}
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
        ) : (
          <button
            onClick={handleConnect}
            disabled={status === 'scanning' || status === 'connecting'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-brand-600 hover:bg-brand-500 disabled:opacity-50
                       text-white text-xs font-medium transition-all duration-200
                       shadow-lg shadow-brand-600/20"
          >
            {status === 'scanning' ? (
              <>
                <BluetoothSearching size={13} className="animate-pulse" />
                Scanning…
              </>
            ) : status === 'connecting' ? (
              <>
                <BluetoothConnected size={13} className="animate-pulse" />
                Connecting…
              </>
            ) : (
              <>
                <BluetoothOff size={13} />
                Connect
              </>
            )}
          </button>
        )}
      </div>
    </header>
  )
}
