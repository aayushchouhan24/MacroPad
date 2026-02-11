// =============================================================================
// ScanModal — device picker overlay
// =============================================================================
import { motion, AnimatePresence } from 'framer-motion'
import { BluetoothSearching, X, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function ScanModal(): JSX.Element {
  const open    = useAppStore((s) => s.scanModalOpen)
  const close   = useAppStore((s) => s.setScanModalOpen)
  const devices = useAppStore((s) => s.discoveredDevices)

  function handleSelect(deviceId: string): void {
    window.api?.selectDevice(deviceId)
    close(false)
  }

  function handleCancel(): void {
    window.api?.cancelScan()
    close(false)
    useAppStore.getState().setConnectionStatus('disconnected')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/60 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-[400px] max-h-[480px] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
              <div className="flex items-center gap-3">
                <BluetoothSearching size={20} className="text-brand-400 animate-pulse" />
                <h2 className="text-sm font-semibold">Scanning for MacroPad…</h2>
              </div>
              <button onClick={handleCancel} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>

            {/* Device list */}
            <div className="flex-1 overflow-y-auto p-3">
              {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Loader2 size={28} className="animate-spin mb-3" />
                  <p className="text-sm">Looking for devices…</p>
                  <p className="text-xs mt-1">Make sure your MacroPad is powered on</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {devices.map((d) => (
                    <button
                      key={d.deviceId}
                      onClick={() => handleSelect(d.deviceId)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl
                                 bg-slate-800/60 hover:bg-slate-700/60
                                 border border-slate-700/30 hover:border-brand-500/40
                                 transition-colors text-left"
                    >
                      <BluetoothSearching size={16} className="text-brand-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.deviceName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{d.deviceId}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-700/40">
              <button onClick={handleCancel} className="btn-secondary w-full text-center">
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
