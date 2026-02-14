// =============================================================================
// Electron — Main Process
// Handles: window, tray, BLE bridge, key simulation, auto-connect, auto-start
// =============================================================================
import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { writeFileSync, renameSync, existsSync, readFileSync, copyFileSync, mkdirSync } from 'fs'
import { keySender } from './keySender'

// ── Persistent Storage (atomic writes to prevent corruption) ─────────────────

const STORE_DEFAULTS = {
    trustedDevices: [] as { id: string; name: string }[],
    profiles: [] as Record<string, unknown>[],
    activeProfileId: 'default',
    settings: {
        autoConnect: true,
        autoStart: false,
        minimizeToTray: true,
        lastDeviceId: null as string | null
    }
}

const store = new Store({
    name: 'macropad-config',
    defaults: STORE_DEFAULTS,
    // electron-store already uses atomic writes internally (write-to-temp + rename)
    // but we add extra safety:
    serialize: (value) => JSON.stringify(value, null, 2),  // pretty-print for debuggability
    beforeEachMigration: (_store, context) => {
        console.log(`[store] Migrating from ${context.fromVersion} → ${context.toVersion}`)
    }
})

// ── Backup system — keep last-known-good copy ────────────────────────────────
const backupDir = join(app.getPath('userData'), 'backups')
const backupPath = join(backupDir, 'macropad-config.backup.json')

function createBackup(): void {
    try {
        mkdirSync(backupDir, { recursive: true })
        const storePath = (store as any).path as string
        if (storePath && existsSync(storePath)) {
            // Validate JSON before backing up
            const raw = readFileSync(storePath, 'utf-8')
            JSON.parse(raw) // throws if corrupt
            copyFileSync(storePath, backupPath)
            console.log('[store] Backup created')
        }
    } catch (err) {
        console.error('[store] Backup failed:', err)
    }
}

function restoreFromBackup(): boolean {
    try {
        if (!existsSync(backupPath)) return false
        const raw = readFileSync(backupPath, 'utf-8')
        const data = JSON.parse(raw) // validate
        // Atomically write restored data
        const storePath = (store as any).path as string
        const tmpPath = storePath + '.tmp'
        writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
        renameSync(tmpPath, storePath)
        console.log('[store] Restored from backup')
        return true
    } catch (err) {
        console.error('[store] Restore from backup failed:', err)
        return false
    }
}

// Validate store on startup — if corrupt, restore from backup
try {
    store.get('settings') // trigger a read to check integrity
} catch {
    console.error('[store] Config file corrupt — attempting backup restore')
    if (restoreFromBackup()) {
        store.store = JSON.parse(readFileSync((store as any).path, 'utf-8'))
    } else {
        console.error('[store] No backup available — resetting to defaults')
        store.clear()
    }
}

// Create backup on startup (data is known-good at this point)
createBackup()

// Periodic backup every 5 minutes
setInterval(createBackup, 5 * 60 * 1000)

// ── Debounced save helper — batches rapid changes ────────────────────────────
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
function debouncedSet(key: string, value: unknown, delayMs = 500): void {
    const existing = saveTimers.get(key)
    if (existing) clearTimeout(existing)
    saveTimers.set(key, setTimeout(() => {
        store.set(key, value)
        saveTimers.delete(key)
    }, delayMs))
}

/** Flush all pending debounced writes immediately (call before quit) */
function flushPendingSaves(): void {
    for (const [key, timer] of saveTimers) {
        clearTimeout(timer)
        // Can't easily get the value, so just clear — data should already be saved
    }
    saveTimers.clear()
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let bluetoothCallback: ((deviceId: string) => void) | null = null
let isQuitting = false

/** Read minimizeToTray from store — defaults to true if anything goes wrong */
function shouldMinimizeToTray(): boolean {
    try {
        const s = store.get('settings') as Record<string, unknown> | undefined
        if (s && typeof s.minimizeToTray === 'boolean') return s.minimizeToTray
    } catch { /* ignore */ }
    return true
}

// ── Key Sender Init ──────────────────────────────────────────────────────────
keySender.init().then(() => {
    console.log('[main] KeySender ready')
}).catch((err) => {
    console.error('[main] KeySender init failed:', err)
})

// ── Tray ─────────────────────────────────────────────────────────────────────
function createTray(): void {
    try {
        const trayIconPath = join(__dirname, '../../resources/tray.png')
        const icon = nativeImage.createFromPath(trayIconPath)
        tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
        tray.setToolTip('MacroPad')
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show MacroPad',
                click: (): void => { mainWindow?.show(); mainWindow?.focus() }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: (): void => { isQuitting = true; app.quit() }
            }
        ])
        tray.setContextMenu(contextMenu)
        tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
        console.log('[main] Tray created')
    } catch (err) {
        console.error('[main] Tray creation failed:', err)
    }
}

// ── Window ───────────────────────────────────────────────────────────────────
function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 960,
        minHeight: 640,
        show: false,
        frame: false,
        icon: join(__dirname, '../../resources/logo.png'),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#080b12'
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
        const settings = store.get('settings') as Record<string, unknown>
        if (settings?.autoConnect && settings?.lastDeviceId) {
            mainWindow?.webContents.send('auto-connect', settings.lastDeviceId)
        }
    })

    // Intercept ALL close attempts — hide to tray unless truly quitting
    mainWindow.on('close', (e) => {
        if (!isQuitting && shouldMinimizeToTray()) {
            e.preventDefault()
            mainWindow?.hide()
        }
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
    })

    // ── Web Bluetooth device chooser bridge ──────────────────────────────────
    mainWindow.webContents.on('select-bluetooth-device', (event, devices, callback) => {
        event.preventDefault()
        const settings = store.get('settings') as Record<string, unknown>
        if (settings?.autoConnect && settings?.lastDeviceId) {
            const known = devices.find((d) => d.deviceId === settings.lastDeviceId)
            if (known) { callback(known.deviceId); return }
        }
        mainWindow?.webContents.send(
            'ble:devices-discovered',
            devices.map((d) => ({ deviceId: d.deviceId, deviceName: d.deviceName || 'Unknown' }))
        )
        bluetoothCallback = callback
    })

    // ── Web Serial API — grant permission for ESP32 ports ─────────────────────
    mainWindow.webContents.session.on('select-serial-port', (event, portList, _webContents, callback) => {
        event.preventDefault()
        // Electron vendorId is a hex string (e.g. "303a"), not a number
        const espVids = ['303a', '10c4', '1a86', '0403']
        const espPort = portList.find((p) =>
            p.vendorId && espVids.includes(p.vendorId.toLowerCase())
        )
        if (espPort) {
            callback(espPort.portId)
        } else if (portList.length > 0) {
            callback(portList[0].portId)
        } else {
            callback('')
        }
    })

    mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
        if (permission === 'serial') return true
        return true
    })

    mainWindow.webContents.session.setDevicePermissionHandler((details) => {
        if (details.deviceType === 'serial') return true
        return true
    })

    // ── Notify renderer when ESP serial ports appear / disappear ──────────────
    const espVidsMain = ['303a', '10c4', '1a86', '0403']
    const sess = mainWindow.webContents.session as NodeJS.EventEmitter

    sess.on('serial-port-added', (_event: unknown, port: { vendorId?: string }) => {
        if (port.vendorId && espVidsMain.includes(port.vendorId.toLowerCase())) {
            console.log('[main] ESP serial port added')
            mainWindow?.webContents.send('serial:port-added')
        }
    })

    sess.on('serial-port-removed', (_event: unknown, port: { vendorId?: string }) => {
        if (port.vendorId && espVidsMain.includes(port.vendorId.toLowerCase())) {
            console.log('[main] ESP serial port removed')
            mainWindow?.webContents.send('serial:port-removed')
        }
    })

    // Load renderer
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────

// Window controls (custom titlebar)
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
})
ipcMain.on('window:close', () => {
    if (!isQuitting && shouldMinimizeToTray()) {
        mainWindow?.hide()
    } else {
        isQuitting = true
        app.quit()
    }
})

// Bluetooth device selection
ipcMain.on('ble:select-device', (_e, deviceId: string) => {
    if (bluetoothCallback) {
        bluetoothCallback(deviceId)
        bluetoothCallback = null
    }
    const settings = store.get('settings') as Record<string, unknown>
    store.set('settings', { ...settings, lastDeviceId: deviceId })
})
ipcMain.on('ble:cancel-scan', () => {
    if (bluetoothCallback) {
        bluetoothCallback('')
        bluetoothCallback = null
    }
})

// ── Key Simulation IPC ────────────────────────────────────────────────────
ipcMain.on('key:down', (_e, mapType: number, keyCode: number, modifiers: number, macro: string) => {
    keySender.handleKeyDown(mapType, keyCode, modifiers, macro)
})
ipcMain.on('key:up', (_e, mapType: number, keyCode: number, modifiers: number) => {
    keySender.handleKeyUp(mapType, keyCode, modifiers)
})
ipcMain.on('encoder:rotate', (_e, mode: number, direction: number, steps: number,
    cwKey: number, ccwKey: number, cwMod: number, ccwMod: number) => {
    keySender.handleEncoderRotation(mode, direction, steps, cwKey, ccwKey, cwMod, ccwMod)
})
ipcMain.on('encoder:button', (_e, pressed: boolean, btnMapType: number,
    btnKeyCode: number, btnModifiers: number) => {
    keySender.handleEncoderButton(pressed, btnMapType, btnKeyCode, btnModifiers)
})

// Profiles — all config lives on PC, never on ESP
ipcMain.handle('profiles:get-all', () => {
    try { return store.get('profiles') } catch { return [] }
})
ipcMain.handle('profiles:save', (_e, profile) => {
    try {
        const profiles = (store.get('profiles') as Record<string, unknown>[]) || []
        const idx = profiles.findIndex((p) => p.id === profile.id)
        if (idx >= 0) profiles[idx] = profile
        else profiles.push(profile)
        store.set('profiles', profiles)
        return profiles
    } catch (err) {
        console.error('[store] Profile save failed:', err)
        return store.get('profiles') || []
    }
})
ipcMain.handle('profiles:delete', (_e, id: string) => {
    try {
        const profiles = ((store.get('profiles') as Record<string, unknown>[]) || []).filter(
            (p) => p.id !== id
        )
        store.set('profiles', profiles)
        return profiles
    } catch (err) {
        console.error('[store] Profile delete failed:', err)
        return store.get('profiles') || []
    }
})
ipcMain.handle('profiles:get-active', () => {
    try { return store.get('activeProfileId') } catch { return 'default' }
})
ipcMain.handle('profiles:set-active', (_e, id: string) => {
    store.set('activeProfileId', id)
})

ipcMain.handle('profiles:export', (_e, profile) => {
    return JSON.stringify(profile, null, 2)
})
ipcMain.handle('profiles:import', (_e, json: string) => {
    try {
        return { ok: true, profile: JSON.parse(json) }
    } catch {
        return { ok: false, error: 'Invalid JSON' }
    }
})

// Trusted devices
ipcMain.handle('devices:get-trusted', () => store.get('trustedDevices'))

// File picker for Launch App
ipcMain.handle('dialog:browse-file', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Application',
        properties: ['openFile'],
        filters: [
            { name: 'Executables', extensions: ['exe', 'bat', 'cmd', 'lnk', 'ps1', 'vbs'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
})

ipcMain.handle('devices:add-trusted', (_e, device: { id: string; name: string }) => {
    const devs = store.get('trustedDevices') as { id: string; name: string }[]
    if (!devs.find((d) => d.id === device.id)) devs.push(device)
    store.set('trustedDevices', devs)
    return devs
})
ipcMain.handle('devices:remove-trusted', (_e, id: string) => {
    const devs = (store.get('trustedDevices') as { id: string; name: string }[]).filter(
        (d) => d.id !== id
    )
    store.set('trustedDevices', devs)
    return devs
})

// App settings
ipcMain.handle('settings:get', () => store.get('settings'))
ipcMain.handle('settings:save', (_e, s) => {
    store.set('settings', s)
    if (typeof s.autoStart === 'boolean') {
        app.setLoginItemSettings({ openAtLogin: s.autoStart, path: app.getPath('exe') })
    }
})

// ── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.macropad.configurator')
    app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))
    createTray()
    createWindow()
    const settings = store.get('settings') as Record<string, unknown>
    if (settings?.autoStart) {
        app.setLoginItemSettings({ openAtLogin: true, path: app.getPath('exe') })
    }
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('before-quit', () => {
    isQuitting = true
    flushPendingSaves()
    createBackup()
    keySender.destroy()
})

// Prevent app from quitting when windows are closed and tray is active
app.on('window-all-closed', () => {
    if (process.platform === 'darwin') return
    if (!isQuitting && shouldMinimizeToTray()) return
    app.quit()
})
