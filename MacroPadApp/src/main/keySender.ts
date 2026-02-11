// =============================================================================
// keySender.ts — Windows key simulation via a persistent PowerShell process
// Uses SendInput via C# P/Invoke — zero native npm dependencies.
// =============================================================================
import { spawn, exec, ChildProcess } from 'child_process'
import { shell } from 'electron'
import { HID_TO_VK, modBitsToVkList } from './hidToVk'
import {
  MAP_SINGLE_KEY,
  MAP_MEDIA_KEY,
  MAP_MODIFIER_COMBO,
  MAP_TEXT_MACRO,
  MAP_SHORTCUT,
  MAP_LAUNCH_APP,
  ENC_MODE_VOLUME,
  ENC_MODE_SCROLL,
  ENC_MODE_ZOOM,
  ENC_MODE_BRIGHTNESS,
  ENC_MODE_CUSTOM
} from './protocolConstants'

// ── C# helper compiled at runtime via PowerShell Add-Type ───────────────────
const INIT_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class KS {
    [StructLayout(LayoutKind.Sequential)]
    struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct MOUSEINPUT {
        public int dx;
        public int dy;
        public int mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Explicit)]
    struct INPUTUNION {
        [FieldOffset(0)] public KEYBDINPUT ki;
        [FieldOffset(0)] public MOUSEINPUT mi;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct INPUT {
        public uint type;
        public INPUTUNION u;
    }

    [DllImport("user32.dll", SetLastError=true)]
    static extern uint SendInput(uint n, INPUT[] inputs, int size);

    const uint INPUT_KEYBOARD = 1;
    const uint INPUT_MOUSE    = 0;
    const uint KEYEVENTF_KEYUP = 0x0002;
    const uint MOUSEEVENTF_WHEEL = 0x0800;

    public static void KeyDown(int vk) {
        INPUT[] i = new INPUT[1];
        i[0].type = INPUT_KEYBOARD;
        i[0].u.ki.wVk = (ushort)vk;
        i[0].u.ki.dwFlags = 0;
        SendInput(1, i, Marshal.SizeOf(typeof(INPUT)));
    }

    public static void KeyUp(int vk) {
        INPUT[] i = new INPUT[1];
        i[0].type = INPUT_KEYBOARD;
        i[0].u.ki.wVk = (ushort)vk;
        i[0].u.ki.dwFlags = KEYEVENTF_KEYUP;
        SendInput(1, i, Marshal.SizeOf(typeof(INPUT)));
    }

    public static void Tap(int vk, int ms) {
        KeyDown(vk);
        Thread.Sleep(ms);
        KeyUp(vk);
    }

    public static void Scroll(int amount) {
        INPUT[] i = new INPUT[1];
        i[0].type = INPUT_MOUSE;
        i[0].u.mi.dwFlags = MOUSEEVENTF_WHEEL;
        i[0].u.mi.mouseData = amount;
        SendInput(1, i, Marshal.SizeOf(typeof(INPUT)));
    }
}
"@
Write-Host "RDY"
$host.UI.RawUI.WindowTitle = "MacroPad-KeySender"
while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    try { Invoke-Expression $line } catch { }
}
`

class KeySender {
  private ps: ChildProcess | null = null
  private ready = false
  private queue: string[] = []
  private readyPromise: Promise<void> | null = null

  /** Start the PowerShell worker. Call once at app startup. */
  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise

    this.readyPromise = new Promise<void>((resolve) => {
      this.ps = spawn('powershell.exe', [
        '-NoProfile', '-NoLogo', '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command', '-'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      })

      this.ps.stdout!.on('data', (chunk: Buffer) => {
        if (!this.ready && chunk.toString().includes('RDY')) {
          this.ready = true
          for (const cmd of this.queue) this.send(cmd)
          this.queue = []
          resolve()
        }
      })

      this.ps.stderr!.on('data', (d: Buffer) => {
        console.warn('[keySender stderr]', d.toString().trim())
      })

      this.ps.on('exit', (code) => {
        console.warn('[keySender] PS exited with code', code)
        this.ready = false
        this.ps = null
        this.readyPromise = null
      })

      this.ps.stdin!.write(INIT_SCRIPT + '\n')
    })

    return this.readyPromise
  }

  private send(cmd: string): void {
    if (this.ready && this.ps?.stdin?.writable) {
      this.ps.stdin.write(cmd + '\n')
    } else {
      this.queue.push(cmd)
    }
  }

  // ── Low-level ──────────────────────────────────────────────────────────

  vkDown(vk: number): void {
    this.send(`[KS]::KeyDown(${vk})`)
  }

  vkUp(vk: number): void {
    this.send(`[KS]::KeyUp(${vk})`)
  }

  vkTap(vk: number, ms = 8): void {
    this.send(`[KS]::Tap(${vk},${ms})`)
  }

  scroll(amount: number): void {
    this.send(`[KS]::Scroll(${amount})`)
  }

  // ── High-level: HID key events → system keystrokes ────────────────────

  /** Simulate a mapped key press (key down) */
  handleKeyDown(mapType: number, keyCode: number, modifiers: number, macro: string): void {
    switch (mapType) {
      case MAP_SINGLE_KEY:
      case MAP_MEDIA_KEY: {
        const vk = HID_TO_VK[keyCode]
        if (vk) this.vkDown(vk)
        break
      }
      case MAP_MODIFIER_COMBO:
      case MAP_SHORTCUT: {
        const mods = modBitsToVkList(modifiers)
        for (const m of mods) this.vkDown(m)
        const vk = HID_TO_VK[keyCode]
        if (vk) this.vkDown(vk)
        break
      }
      case MAP_TEXT_MACRO: {
        if (macro) this.typeString(macro)
        break
      }
      case MAP_LAUNCH_APP: {
        if (macro) this.launchApp(macro)
        break
      }
    }
  }

  /** Launch an application or run a shell command */
  private launchApp(command: string): void {
    try {
      const trimmed = command.trim()
      // If it looks like a file path (contains \ or ends with .exe/.lnk/.bat etc), open it
      if (/\.[a-zA-Z]{2,4}$/.test(trimmed) || trimmed.includes('\\') || trimmed.includes('/')) {
        shell.openPath(trimmed).then((err) => {
          if (err) console.warn('[keySender] openPath error:', err)
        })
      } else {
        // Run as a shell command
        exec(trimmed, { windowsHide: true }, (err) => {
          if (err) console.warn('[keySender] exec error:', err.message)
        })
      }
    } catch (err) {
      console.warn('[keySender] launchApp error:', err)
    }
  }

  /** Simulate a mapped key release (key up) */
  handleKeyUp(mapType: number, keyCode: number, modifiers: number): void {
    switch (mapType) {
      case MAP_SINGLE_KEY:
      case MAP_MEDIA_KEY: {
        const vk = HID_TO_VK[keyCode]
        if (vk) this.vkUp(vk)
        break
      }
      case MAP_MODIFIER_COMBO:
      case MAP_SHORTCUT: {
        const vk = HID_TO_VK[keyCode]
        if (vk) this.vkUp(vk)
        const mods = modBitsToVkList(modifiers)
        for (const m of mods.reverse()) this.vkUp(m)
        break
      }
      // TEXT_MACRO: nothing to release (typed on press)
    }
  }

  /** Simulate an encoder rotation step */
  handleEncoderRotation(mode: number, direction: number, _steps: number,
                        cwKey: number, ccwKey: number,
                        cwMod: number, ccwMod: number): void {
    const isCW = direction === 0x01
    switch (mode) {
      case ENC_MODE_VOLUME:
        this.vkTap(isCW ? 0xaf : 0xae) // VK_VOLUME_UP / DOWN
        break
      case ENC_MODE_SCROLL:
        this.scroll(isCW ? 120 : -120) // WHEEL_DELTA = 120
        break
      case ENC_MODE_ZOOM:
        this.vkDown(0xa2) // Ctrl
        this.scroll(isCW ? 120 : -120)
        this.vkUp(0xa2)
        break
      case ENC_MODE_BRIGHTNESS:
        // No standard VK for brightness; skip or use custom
        break
      case ENC_MODE_CUSTOM: {
        const hid = isCW ? cwKey : ccwKey
        const mod = isCW ? cwMod : ccwMod
        const vk = HID_TO_VK[hid]
        if (vk) {
          const mods = modBitsToVkList(mod)
          for (const m of mods) this.vkDown(m)
          this.vkTap(vk)
          for (const m of mods.reverse()) this.vkUp(m)
        }
        break
      }
    }
  }

  /** Simulate an encoder button press */
  handleEncoderButton(pressed: boolean, btnMapType: number,
                      btnKeyCode: number, btnModifiers: number): void {
    if (btnMapType === 0) return // MAP_NONE
    const vk = HID_TO_VK[btnKeyCode]
    if (!vk) return
    const mods = modBitsToVkList(btnModifiers)
    if (pressed) {
      for (const m of mods) this.vkDown(m)
      this.vkDown(vk)
    } else {
      this.vkUp(vk)
      for (const m of mods.reverse()) this.vkUp(m)
    }
  }

  /** Type a text string character by character */
  private typeString(text: string): void {
    for (const ch of text) {
      // PowerShell: use .NET SendKeys or manual VK mapping
      // Safer: use [System.Windows.Forms.SendKeys]
      const escaped = ch
        .replace(/\+/g, '{+}')
        .replace(/%/g, '{%}')
        .replace(/\^/g, '{^}')
        .replace(/~/g, '{~}')
        .replace(/\(/g, '{(}')
        .replace(/\)/g, '{)}')
        .replace(/\{/g, '{{}')
        .replace(/\}/g, '{}}')
      this.send(
        `Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue; ` +
        `[System.Windows.Forms.SendKeys]::SendWait('${escaped}')`
      )
    }
  }

  /** Kill the PowerShell worker */
  destroy(): void {
    if (this.ps) {
      this.ps.stdin?.end()
      this.ps.kill()
      this.ps = null
    }
    this.ready = false
    this.readyPromise = null
  }
}

export const keySender = new KeySender()
