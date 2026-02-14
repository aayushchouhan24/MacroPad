// =============================================================================
// useAppStore — Zustand global state
// =============================================================================
import { create } from 'zustand'
import type {
  ConnectionStatus,
  Page,
  KeyMapping,
  EncoderConfig,
  DeviceInfo,
  Profile,
  EventLogEntry,
  AppNotification,
  DiscoveredDevice
} from '@/lib/types'
import { defaultKeyMapping, defaultEncoderConfig, defaultProfile } from '@/lib/types'
import { NUM_KEYS } from '@/lib/constants'

interface AppState {
  // ── Connection ────────────────────────────────────────────────────────────
  connectionStatus: ConnectionStatus
  deviceName: string | null
  deviceInfo: DeviceInfo | null
  batteryLevel: number

  // ── Live state ────────────────────────────────────────────────────────────
  pressedKeys: boolean[]
  encoderPosition: number
  encoderBtnPressed: boolean
  eventLog: EventLogEntry[]

  // ── Configuration ─────────────────────────────────────────────────────────
  keyMappings: KeyMapping[]
  encoderConfig: EncoderConfig

  // ── Profiles ──────────────────────────────────────────────────────────────
  profiles: Profile[]
  activeProfileId: string

  // ── UI ────────────────────────────────────────────────────────────────────
  activePage: Page
  notifications: AppNotification[]
  sidebarExpanded: boolean
  scanModalOpen: boolean
  discoveredDevices: DiscoveredDevice[]
  selectedKeyIndex: number | null

  // ── Actions ───────────────────────────────────────────────────────────────
  setConnectionStatus: (s: ConnectionStatus) => void
  setDeviceName: (n: string | null) => void
  setDeviceInfo: (d: DeviceInfo | null) => void
  setBatteryLevel: (l: number) => void

  setKeyPressed: (idx: number, pressed: boolean) => void
  clearAllKeys: () => void
  setEncoderPosition: (p: number) => void
  setEncoderBtnPressed: (p: boolean) => void
  addEvent: (type: EventLogEntry['type'], message: string) => void
  clearEventLog: () => void

  setKeyMapping: (idx: number, m: KeyMapping) => void
  setAllKeyMappings: (m: KeyMapping[]) => void
  setEncoderConfig: (c: EncoderConfig) => void

  setProfiles: (p: Profile[]) => void
  addProfile: (p: Profile) => void
  updateProfile: (p: Profile) => void
  removeProfile: (id: string) => void
  setActiveProfileId: (id: string) => void

  setActivePage: (p: Page) => void
  addNotification: (n: Omit<AppNotification, 'id'>) => void
  removeNotification: (id: string) => void
  setSidebarExpanded: (e: boolean) => void
  setScanModalOpen: (o: boolean) => void
  setDiscoveredDevices: (d: DiscoveredDevice[]) => void
  setSelectedKeyIndex: (i: number | null) => void
}

let eventIdCounter = 0

export const useAppStore = create<AppState>()((set) => ({
  // ── Defaults ──────────────────────────────────────────────────────────────
  connectionStatus: 'disconnected',
  deviceName: null,
  deviceInfo: null,
  batteryLevel: 100,

  pressedKeys: Array(NUM_KEYS).fill(false),
  encoderPosition: 0,
  encoderBtnPressed: false,
  eventLog: [],

  keyMappings: Array.from({ length: NUM_KEYS }, () => defaultKeyMapping()),
  encoderConfig: defaultEncoderConfig(),

  profiles: [defaultProfile()],
  activeProfileId: '',

  activePage: 'dashboard',
  notifications: [],
  sidebarExpanded: true,
  scanModalOpen: false,
  discoveredDevices: [],
  selectedKeyIndex: null,

  // ── Setters ───────────────────────────────────────────────────────────────
  setConnectionStatus: (s) => set({ connectionStatus: s }),
  setDeviceName: (n) => set({ deviceName: n }),
  setDeviceInfo: (d) => set({ deviceInfo: d }),
  setBatteryLevel: (l) => set({ batteryLevel: l }),

  setKeyPressed: (idx, pressed) =>
    set((s) => {
      const keys = [...s.pressedKeys]
      keys[idx] = pressed
      return { pressedKeys: keys }
    }),
  clearAllKeys: () => set({ pressedKeys: Array(NUM_KEYS).fill(false) }),

  setEncoderPosition: (p) => set({ encoderPosition: p }),
  setEncoderBtnPressed: (p) => set({ encoderBtnPressed: p }),

  addEvent: (type, message) =>
    set((s) => ({
      eventLog: [
        { id: ++eventIdCounter, timestamp: Date.now(), type, message },
        ...s.eventLog
      ].slice(0, 200)   // keep last 200
    })),
  clearEventLog: () => set({ eventLog: [] }),

  setKeyMapping: (idx, m) =>
    set((s) => {
      const km = [...s.keyMappings]
      km[idx] = m
      return { keyMappings: km }
    }),
  setAllKeyMappings: (m) => set({ keyMappings: m }),
  setEncoderConfig: (c) => set({ encoderConfig: c }),

  setProfiles: (p) => set({ profiles: p }),
  addProfile: (p) =>
    set((s) => ({ profiles: [...s.profiles, p] })),
  updateProfile: (p) =>
    set((s) => ({
      profiles: s.profiles.map((pr) => (pr.id === p.id ? p : pr))
    })),
  removeProfile: (id) =>
    set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),
  setActiveProfileId: (id) => set({ activeProfileId: id }),

  setActivePage: (p) => set({ activePage: p }),
  addNotification: (n) =>
    set((s) => ({
      notifications: [...s.notifications, { ...n, id: crypto.randomUUID() }]
    })),
  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id)
    })),
  setSidebarExpanded: (e) => set({ sidebarExpanded: e }),
  setScanModalOpen: (o) => set({ scanModalOpen: o }),
  setDiscoveredDevices: (d) => set({ discoveredDevices: d }),
  setSelectedKeyIndex: (i) => set({ selectedKeyIndex: i })
}))

// ── Auto-save active profile to PC store on mapping changes ────────────────
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

useAppStore.subscribe((state, prev) => {
  const mappingsChanged = state.keyMappings !== prev.keyMappings
  const encoderChanged = state.encoderConfig !== prev.encoderConfig

  if (!mappingsChanged && !encoderChanged) return

  // Debounce to avoid rapid writes
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    const { profiles, activeProfileId, keyMappings, encoderConfig } = useAppStore.getState()
    const active = profiles.find((p) => p.id === activeProfileId)
    if (!active) return

    const updated = { ...active, keyMappings, encoderConfig }
    window.api?.saveProfile(updated).catch(() => {})
  }, 500)
})
