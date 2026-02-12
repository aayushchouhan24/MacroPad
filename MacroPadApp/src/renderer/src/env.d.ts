/// <reference types="vite/client" />

interface Window {
  api?: {
    // Window controls
    windowMinimize: () => void
    windowMaximize: () => void
    windowClose: () => void
    // BLE
    selectDevice: (deviceId: string) => void
    cancelScan: () => void
    onDevicesDiscovered: (
      cb: (devices: { deviceId: string; deviceName: string }[]) => void
    ) => () => void
    onAutoConnect: (cb: (lastDeviceId: string) => void) => () => void
    // Key simulation
    keyDown: (mapType: number, keyCode: number, modifiers: number, macro: string) => void
    keyUp: (mapType: number, keyCode: number, modifiers: number) => void
    encoderRotate: (mode: number, dir: number, steps: number,
      cwKey: number, ccwKey: number, cwMod: number, ccwMod: number) => void
    encoderButton: (pressed: boolean, btnMapType: number,
      btnKeyCode: number, btnModifiers: number) => void
    // Profiles
    getProfiles: () => Promise<unknown[]>
    saveProfile: (p: unknown) => Promise<unknown[]>
    deleteProfile: (id: string) => Promise<unknown[]>
    getActiveProfileId: () => Promise<string>
    setActiveProfileId: (id: string) => Promise<void>
    exportProfile: (p: unknown) => Promise<string>
    importProfile: (json: string) => Promise<{ ok: boolean; profile?: unknown; error?: string }>
    getTrustedDevices: () => Promise<{ id: string; name: string }[]>
    addTrustedDevice: (
      d: { id: string; name: string }
    ) => Promise<{ id: string; name: string }[]>
    removeTrustedDevice: (id: string) => Promise<{ id: string; name: string }[]>
    browseForFile: () => Promise<string | null>
    getSettings: () => Promise<Record<string, unknown>>
    saveSettings: (s: Record<string, unknown>) => Promise<void>
    // Serial port hot-plug
    onSerialPortAdded: (cb: () => void) => () => void
    onSerialPortRemoved: (cb: () => void) => () => void
  }
}
