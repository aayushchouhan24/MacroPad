// =============================================================================
// App.tsx — Root layout: custom titlebar + sidebar + topbar + page router
// =============================================================================
import { useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { TitleBar } from '@/components/layout/TitleBar'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { KeyMapper } from '@/components/keymapper/KeyMapper'
import { ProfileManager } from '@/components/profiles/ProfileManager'
import { DeviceSettings } from '@/components/settings/DeviceSettings'
import { ScanModal } from '@/components/ScanModal'
import { NotificationToast } from '@/components/layout/NotificationToast'
import { useAppStore } from '@/store/useAppStore'
import * as conn from '@/lib/connection'
import {
  EVT_KEY_PRESS,
  EVT_KEY_RELEASE,
  EVT_ENCODER_ROTATE,
  EVT_ENCODER_BTN_PRESS,
  EVT_ENCODER_BTN_RELEASE,
  DIR_CW,
  HID_KEY_LABELS,
  DiscoveredDevice
} from '@/lib/types'

const pages: Record<string, () => JSX.Element> = {
  dashboard: Dashboard,
  keymapper: KeyMapper,
  profiles: ProfileManager,
  settings: DeviceSettings
}

export default function App(): JSX.Element {
  const page = useAppStore((s) => s.activePage)
  const Page = pages[page] ?? Dashboard

  // ── Wire transport events to store + OS key simulation ───────────────────
  useEffect(() => {
    conn.onKeyEvent((type, idx) => {
      const s = useAppStore.getState()
      const pressed = type === EVT_KEY_PRESS
      s.setKeyPressed(idx, pressed)
      
      // Key 4 (5th key) is physically the encoder button
      if (idx === 4) {
        s.setEncoderBtnPressed(pressed)
      }
      
      const km = s.keyMappings[idx]
      const label = HID_KEY_LABELS[km?.keyCode] ?? `Key ${idx}`
      s.addEvent('key', `${label} ${pressed ? 'pressed' : 'released'}`)

      if (km && km.type !== 0) {
        if (pressed) {
          window.api?.keyDown(km.type, km.keyCode, km.modifiers, km.macro)
        } else {
          window.api?.keyUp(km.type, km.keyCode, km.modifiers)
        }
      }
    })

    conn.onEncoderEvent((type, dir, steps) => {
      const s = useAppStore.getState()
      if (type === EVT_ENCODER_ROTATE) {
        const d = dir === DIR_CW ? 1 : -1
        s.setEncoderPosition(s.encoderPosition + d * steps)
        s.addEvent('encoder', `Rotated ${dir === DIR_CW ? 'CW' : 'CCW'} ×${steps}`)
        const ec = s.encoderConfig
        window.api?.encoderRotate(ec.mode, dir, steps,
          ec.cwKeyCode, ec.ccwKeyCode, ec.cwModifiers, ec.ccwModifiers)
      } else if (type === EVT_ENCODER_BTN_PRESS) {
        s.setEncoderBtnPressed(true)
        s.addEvent('encoder', 'Button pressed')
        const ec = s.encoderConfig
        window.api?.encoderButton(true, ec.btnMapType, ec.btnKeyCode, ec.btnModifiers)
      } else if (type === EVT_ENCODER_BTN_RELEASE) {
        s.setEncoderBtnPressed(false)
        s.addEvent('encoder', 'Button released')
        const ec = s.encoderConfig
        window.api?.encoderButton(false, ec.btnMapType, ec.btnKeyCode, ec.btnModifiers)
      }
    })

    conn.onBatteryUpdate((level) => {
      useAppStore.getState().setBatteryLevel(level)
      if (level <= 15) {
        useAppStore.getState().addNotification({
          type: 'warning', title: 'Low Battery', message: `Battery at ${level}%`, auto: true
        })
      }
    })

    // Config data from device is ignored — all config lives on PC.
    // The ESP never sends config data.

    // ── Unified connection change ────────────────────────────────────────
    conn.onConnectionChange(async (connected) => {
      const s = useAppStore.getState()
      if (!connected) {
        if (!conn.isReconnecting()) {
          s.setConnectionStatus('disconnected')
          s.addNotification({ type: 'error', title: 'Device Disconnected', auto: true })
        }
        s.clearAllKeys()
        s.addEvent('system', 'Device disconnected')
      } else {
        const transport = conn.getActiveTransport()
        s.setDeviceName(conn.getDeviceName())
        s.setConnectionStatus('connected')
        s.addNotification({
          type: 'success',
          title: `Connected via ${transport === 'usb' ? 'USB' : 'Bluetooth'}`,
          auto: true
        })
        s.addEvent('system', `Device connected (${transport ?? 'unknown'})`)

        // Fetch device info only — config comes from PC store
        const info = await conn.readDeviceInfo()
        if (info) s.setDeviceInfo(info)
        conn.readBattery().then((b) => s.setBatteryLevel(b)).catch(() => {})

        // Load active profile from PC store
        try {
          const profiles = await window.api?.getProfiles()
          const activeId = await window.api?.getActiveProfileId()
          if (Array.isArray(profiles) && profiles.length > 0) {
            s.setProfiles(profiles as any)
            const active = profiles.find((p: any) => p.id === activeId) || profiles[0]
            if (active) {
              s.setActiveProfileId((active as any).id)
              if ((active as any).keyMappings) s.setAllKeyMappings((active as any).keyMappings)
              if ((active as any).encoderConfig) s.setEncoderConfig((active as any).encoderConfig)
            }
          }
        } catch { /* profiles not available yet */ }
      }
    })

    conn.onReconnecting((active) => {
      const s = useAppStore.getState()
      if (active) {
        s.setConnectionStatus('reconnecting')
        s.addEvent('system', 'Attempting to reconnect...')
      }
    })

    // ── Start USB auto-connect polling ─────────────────────────────────────
    conn.startUsbAutoConnect()

    // IPC listeners
    const cleanupDevices = window.api?.onDevicesDiscovered((devices: DiscoveredDevice[]) => {
      useAppStore.getState().setDiscoveredDevices(devices)
    })

    const cleanupAutoConnect = window.api?.onAutoConnect(async () => {
      const s = useAppStore.getState()
      if (s.connectionStatus !== 'disconnected') return
      s.setConnectionStatus('scanning')
      try {
        const info = await conn.connectBle()
        if (!info) { s.setConnectionStatus('disconnected'); return }
      } catch {
        s.setConnectionStatus('disconnected')
      }
    })

    // ── Serial port hot-plug: try USB auto-connect immediately ─────────────
    const cleanupPortAdded = window.api?.onSerialPortAdded?.(() => {
      console.log('[App] ESP serial port detected — attempting auto-connect')
      conn.tryAutoConnectUsb().catch(() => {})
    })

    return () => {
      conn.stopUsbAutoConnect()
      cleanupDevices?.()
      cleanupAutoConnect?.()
      cleanupPortAdded?.()
    }
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-5">
            <Page />
          </main>
        </div>
      </div>
      <ScanModal />
      <NotificationToast />
    </div>
  )
}
