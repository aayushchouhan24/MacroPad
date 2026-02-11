// =============================================================================
// Preload — Secure context bridge between main ↔ renderer
// =============================================================================
import { contextBridge, ipcRenderer } from 'electron'

export type DiscoveredDevice = { deviceId: string; deviceName: string }

const api = {
  // ── Window controls (custom titlebar) ────────────────────────────────────
  windowMinimize: (): void => ipcRenderer.send('window:minimize'),
  windowMaximize: (): void => ipcRenderer.send('window:maximize'),
  windowClose: (): void => ipcRenderer.send('window:close'),

  // ── BLE device selection bridge ──────────────────────────────────────────
  selectDevice: (deviceId: string): void => ipcRenderer.send('ble:select-device', deviceId),
  cancelScan: (): void => ipcRenderer.send('ble:cancel-scan'),
  onDevicesDiscovered: (cb: (devices: DiscoveredDevice[]) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, devices: DiscoveredDevice[]): void => cb(devices)
    ipcRenderer.on('ble:devices-discovered', handler)
    return () => ipcRenderer.removeListener('ble:devices-discovered', handler)
  },
  onAutoConnect: (cb: (lastDeviceId: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, id: string): void => cb(id)
    ipcRenderer.on('auto-connect', handler)
    return () => ipcRenderer.removeListener('auto-connect', handler)
  },

  // ── Key simulation ───────────────────────────────────────────────────────
  keyDown: (mapType: number, keyCode: number, modifiers: number, macro: string): void =>
    ipcRenderer.send('key:down', mapType, keyCode, modifiers, macro),
  keyUp: (mapType: number, keyCode: number, modifiers: number): void =>
    ipcRenderer.send('key:up', mapType, keyCode, modifiers),
  encoderRotate: (mode: number, dir: number, steps: number,
    cwKey: number, ccwKey: number, cwMod: number, ccwMod: number): void =>
    ipcRenderer.send('encoder:rotate', mode, dir, steps, cwKey, ccwKey, cwMod, ccwMod),
  encoderButton: (pressed: boolean, btnMapType: number,
    btnKeyCode: number, btnModifiers: number): void =>
    ipcRenderer.send('encoder:button', pressed, btnMapType, btnKeyCode, btnModifiers),

  // ── Profiles ─────────────────────────────────────────────────────────────
  getProfiles: (): Promise<unknown[]> => ipcRenderer.invoke('profiles:get-all'),
  saveProfile: (p: unknown): Promise<unknown[]> => ipcRenderer.invoke('profiles:save', p),
  deleteProfile: (id: string): Promise<unknown[]> => ipcRenderer.invoke('profiles:delete', id),
  getActiveProfileId: (): Promise<string> => ipcRenderer.invoke('profiles:get-active'),
  setActiveProfileId: (id: string): Promise<void> => ipcRenderer.invoke('profiles:set-active', id),
  exportProfile: (p: unknown): Promise<string> => ipcRenderer.invoke('profiles:export', p),
  importProfile: (json: string): Promise<{ ok: boolean; profile?: unknown; error?: string }> =>
    ipcRenderer.invoke('profiles:import', json),

  // ── Trusted Devices ──────────────────────────────────────────────────────
  getTrustedDevices: (): Promise<{ id: string; name: string }[]> =>
    ipcRenderer.invoke('devices:get-trusted'),
  addTrustedDevice: (d: { id: string; name: string }): Promise<{ id: string; name: string }[]> =>
    ipcRenderer.invoke('devices:add-trusted', d),
  removeTrustedDevice: (id: string): Promise<{ id: string; name: string }[]> =>
    ipcRenderer.invoke('devices:remove-trusted', id),

  // ── File picker ──────────────────────────────────────────────────────────
  browseForFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:browse-file'),

  // ── Settings ─────────────────────────────────────────────────────────────
  getSettings: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('settings:save', s)
}

contextBridge.exposeInMainWorld('api', api)
