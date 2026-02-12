// =============================================================================
// SerialMonitor — USB serial console viewer
// =============================================================================
import { useState, useEffect, useRef } from 'react'
import { Terminal, Trash2, Copy, ExternalLink } from 'lucide-react'
import * as usb from '@/lib/serialApi'

export function SerialMonitor(): JSX.Element {
  const [lines, setLines] = useState<string[]>([])
  const [autoscroll, setAutoscroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Register console text callback — returns cleanup function
    const unsub = usb.onConsoleText((text) => {
      setLines((prev) => {
        const newLines = [...prev, text]
        // Keep last 500 lines
        if (newLines.length > 500) {
          return newLines.slice(-500)
        }
        return newLines
      })
    })
    return unsub
  }, [])

  useEffect(() => {
    if (autoscroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, autoscroll])

  function handleClear(): void {
    setLines([])
  }

  function handleCopy(): void {
    const text = lines.join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  function handlePopout(): void {
    // Open in new window
    const width = 800
    const height = 600
    const left = window.screenX + (window.innerWidth - width) / 2
    const top = window.screenY + (window.innerHeight - height) / 2
    
    const popup = window.open(
      '',
      'SerialMonitor',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    )
    
    if (popup) {
      popup.document.title = 'Serial Monitor - MacroPad'
      popup.document.body.innerHTML = `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
            background: #0a0e17;
            color: #cbd5e1;
            overflow: hidden;
          }
          .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            padding: 12px;
            gap: 8px;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #141a28;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
          }
          .title {
            font-size: 13px;
            font-weight: 600;
            color: #e2e8f0;
          }
          .console {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            background: #0e121b;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
            font-size: 12px;
            line-height: 1.5;
          }
          .console::-webkit-scrollbar { width: 8px; }
          .console::-webkit-scrollbar-track { background: transparent; }
          .console::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
          }
          .console::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.15);
          }
          .line {
            padding: 2px 0;
            color: #94a3b8;
          }
        </style>
        <div class="container">
          <div class="header">
            <div class="title">🔌 Serial Monitor</div>
          </div>
          <div class="console" id="console"></div>
        </div>
      `
      
      const consoleEl = popup.document.getElementById('console')
      
      // Copy current lines
      lines.forEach(line => {
        const lineEl = popup.document.createElement('div')
        lineEl.className = 'line'
        lineEl.textContent = line
        consoleEl?.appendChild(lineEl)
      })
      
      // Listen for new lines (additive — doesn't overwrite main listener)
      const unsub = usb.onConsoleText((text) => {
        if (!popup.closed && consoleEl) {
          const lineEl = popup.document.createElement('div')
          lineEl.className = 'line'
          lineEl.textContent = text
          consoleEl.appendChild(lineEl)
          
          // Keep last 500 lines
          while (consoleEl.children.length > 500) {
            consoleEl.removeChild(consoleEl.firstChild!)
          }
          
          // Autoscroll
          consoleEl.scrollTop = consoleEl.scrollHeight
        }
      })

      // Clean up when popup closes
      const checkClosed = setInterval(() => {
        if (popup.closed) { unsub(); clearInterval(checkClosed) }
      }, 1000)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-300">Serial Monitor</h2>
          <span className="text-xs text-slate-600">({lines.length} lines)</span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoscroll}
              onChange={(e) => setAutoscroll(e.target.checked)}
              className="rounded"
            />
            Autoscroll
          </label>
          
          <button
            onClick={handleCopy}
            className="btn-secondary !py-1 !px-2 flex items-center gap-1"
            title="Copy all"
          >
            <Copy size={13} />
          </button>
          
          <button
            onClick={handlePopout}
            className="btn-secondary !py-1 !px-2 flex items-center gap-1"
            title="Open in new window"
          >
            <ExternalLink size={13} />
          </button>
          
          <button
            onClick={handleClear}
            className="btn-secondary !py-1 !px-2 flex items-center gap-1"
            title="Clear"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Console */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 bg-[#0a0e17] font-mono text-[11px] leading-relaxed"
      >
        {lines.length === 0 ? (
          <div className="text-slate-600 text-center py-8">
            No serial output yet. Connect via USB to see debug messages.
          </div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="text-slate-400 hover:bg-white/[0.02] px-1 -mx-1">
              <span className="text-slate-700 mr-2 select-none">{i + 1}</span>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
