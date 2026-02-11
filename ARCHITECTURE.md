# MacroPad — Architecture & Setup Guide

## System Overview

```
┌────────────────────┐         BLE          ┌─────────────────────────────┐
│   ESP32-C3 MCU     │◄──────────────────►  │    Electron Desktop App     │
│                    │    Custom Service     │                             │
│  2×5 Key Matrix    │    e5e60001-...       │  Main Process               │
│  Rotary Encoder    │                      │   ├─ Window management      │
│  NimBLE Stack      │                      │   ├─ IPC handlers           │
│  NVS Config Store  │                      │   ├─ electron-store         │
│  Battery Monitor   │                      │   └─ BLE device selection   │
│  Sleep Manager     │                      │                             │
└────────────────────┘                      │  Renderer (React)           │
                                            │   ├─ Web Bluetooth API      │
                                            │   ├─ Zustand state          │
                                            │   ├─ Tailwind + Framer      │
                                            │   └─ 5 pages (see below)   │
                                            └─────────────────────────────┘
```

---

## Part 1 — BLE Protocol Design

### Service & Characteristics

| UUID suffix | Name           | Properties    | Size    | Description                        |
|-------------|----------------|---------------|---------|------------------------------------|
| `0002`      | Key Event      | Notify        | 4 bytes | `[event_type, key_index, 0, 0]`   |
| `0003`      | Encoder Event  | Notify        | 4 bytes | `[event_type, direction, steps, 0]`|
| `0004`      | Device Info    | Read          | 8 bytes | FW version, layout, capabilities   |
| `0005`      | Battery        | Read + Notify | 1 byte  | Percentage 0-100                   |
| `0006`      | Config         | R/W/Notify    | varies  | Config data exchange               |
| `0007`      | Command        | Write         | varies  | Commands from app → device         |

### Event Types
- `0x01` Key Press · `0x02` Key Release
- `0x10` Encoder Rotate · `0x11` Encoder Btn Press · `0x12` Encoder Btn Release

### Commands (app → device)
| Byte | Command                 | Payload                              |
|------|-------------------------|--------------------------------------|
| 0x01 | Factory Reset           | —                                    |
| 0x02 | Set BT Name             | UTF-8 string                         |
| 0x03 | Set Debounce            | uint16 BE (ms)                       |
| 0x04 | Set Encoder Sensitivity | uint8 (1-10)                         |
| 0x05 | Set Sleep Timeout       | uint32 BE (ms)                       |
| 0x06 | Save Config to Flash    | —                                    |
| 0x07 | Request Config          | — (device responds via Config char)  |
| 0x08 | Set Key Map             | keyIndex, type, code, mods, ml, macro|
| 0x09 | Set Encoder Mode        | mode, cwKey, ccwKey, ...             |
| 0x0A | Sync Full Profile       | nameLen, name, keyMaps[], encCfg     |

### Security
- Bonding with Secure Connections (Just Works — no MITM)
- Paired devices stored in NimBLE bond table
- Factory reset clears all bonds

---

## Part 2 — Firmware Architecture

### File Structure
```
MacroPadSketch/
├── MacroPadSketch.ino   # Main: setup(), loop(), callbacks
├── Config.h             # Pins, UUIDs, protocol constants, structs
├── KeyMatrix.h/.cpp     # 2×5 scanning with debounce
├── Encoder.h/.cpp       # Quadrature ISR + button debounce
├── Battery.h/.cpp       # ADC averaging, optional
├── ConfigStore.h/.cpp   # NVS (Preferences) persistence
└── BleService.h/.cpp    # NimBLE server, chars, notify/write
```

### Dependencies
- **Board**: `esp32` Arduino core (any recent version)
- **Library**: NimBLE-Arduino ≥ 1.4 (install via Library Manager)

### Main Loop Flow
```
loop() → keyMatrix.scan()  → debounce → callback → BLE notify
       → encoder.update()  → ISR count → callback → BLE notify
       → battery.update()  → ADC read  → callback → BLE notify
       → checkSleep()      → light sleep if idle
```

---

## Part 3 — Desktop App Architecture

### Stack
| Layer        | Technology                                    |
|--------------|-----------------------------------------------|
| Framework    | Electron 28                                   |
| Bundler      | electron-vite + Vite 5                        |
| UI           | React 18 + TypeScript 5                       |
| Styling      | Tailwind CSS 3 (dark-mode first)              |
| Animation    | Framer Motion 11                              |
| Icons        | Lucide React                                  |
| State        | Zustand 5                                     |
| BLE          | Web Bluetooth API (Chromium built-in)         |
| Persistence  | electron-store                                |

### How BLE Works in This App

The standard Web Bluetooth API runs **directly in the renderer process** —
no native Node modules needed.

1. Renderer calls `navigator.bluetooth.requestDevice({ filters: … })`
2. Electron fires `select-bluetooth-device` in the main process
3. Main forwards discovered devices to renderer via IPC
4. User picks a device in our custom `ScanModal` UI
5. Main calls the Bluetooth callback with the selected device ID
6. `requestDevice()` resolves → renderer calls `device.gatt.connect()`
7. Renderer subscribes to GATT notifications for events
8. All BLE reads/writes happen directly from the renderer

### Main Process Responsibilities
- Window creation & lifecycle
- `select-bluetooth-device` event bridge
- `electron-store` persistence (profiles, settings, trusted devices)
- IPC handlers for data CRUD

### IPC Channels

| Channel                 | Direction | Purpose                        |
|-------------------------|-----------|--------------------------------|
| `ble:devices-discovered`| M→R       | Forward BLE discovery results  |
| `ble:select-device`     | R→M       | User selected a device         |
| `ble:cancel-scan`       | R→M       | User cancelled scan            |
| `profiles:*`            | R↔M       | Profile CRUD                   |
| `devices:*`             | R↔M       | Trusted device management      |
| `settings:*`            | R↔M       | App settings                   |

### Folder Structure
```
MacroPadApp/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json / .node.json / .web.json
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main/
│   │   └── index.ts                    # Electron main process
│   ├── preload/
│   │   └── index.ts                    # Context bridge
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx                # React entry
│           ├── App.tsx                 # Root layout + BLE wiring
│           ├── index.css               # Tailwind + custom styles
│           ├── env.d.ts                # Window.api types
│           ├── lib/
│           │   ├── types.ts            # Shared types + protocol consts
│           │   ├── constants.ts        # BLE UUIDs
│           │   └── bleApi.ts           # Web Bluetooth wrapper
│           ├── store/
│           │   └── useAppStore.ts      # Zustand global store
│           └── components/
│               ├── layout/
│               │   ├── Sidebar.tsx
│               │   ├── TopBar.tsx
│               │   └── NotificationToast.tsx
│               ├── ScanModal.tsx
│               ├── dashboard/
│               │   ├── Dashboard.tsx
│               │   ├── KeyGrid.tsx
│               │   ├── EncoderKnob.tsx
│               │   └── EventLog.tsx
│               ├── keymapper/
│               │   ├── KeyMapper.tsx
│               │   └── KeyConfigPanel.tsx
│               ├── encoder/
│               │   └── EncoderSettings.tsx
│               ├── profiles/
│               │   └── ProfileManager.tsx
│               └── settings/
│                   └── DeviceSettings.tsx
```

### State Management (Zustand)

Single store with these sections:
- **Connection** — status, deviceName, deviceInfo, battery
- **Live** — pressedKeys[], encoderPosition, eventLog[]
- **Config** — keyMappings[10], encoderConfig
- **Profiles** — profiles[], activeProfileId
- **UI** — activePage, notifications, sidebar, scanModal

### React ↔ Electron Communication

```
React Component
   │
   ├──► bleApi.ts (Web Bluetooth) ──► ESP32-C3 over BLE
   │
   └──► window.api.* (preload bridge) ──► IPC ──► main/index.ts
                                                      │
                                                      └──► electron-store
```

---

## Getting Started

### Firmware
1. Open `MacroPadSketch/MacroPadSketch.ino` in Arduino IDE
2. Install **NimBLE-Arduino** library (Library Manager → search "NimBLE")
3. Select board **ESP32C3 Dev Module**
4. Adjust pin defines in `Config.h` if your wiring differs
5. Upload

### Desktop App
```bash
cd MacroPadApp
npm install
npm run dev          # development with hot reload
npm run build        # production build
npm run dist         # package as installer
```

### First Connection
1. Power on the MacroPad — it starts advertising automatically
2. Launch the desktop app
3. Click **Connect** in the top bar
4. Select your MacroPad from the device list
5. The dashboard shows live key presses and encoder rotation
