// =============================================================================
// NotificationToast — auto-dismissing toast stack
// =============================================================================
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

const ICON_MAP = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle
}

const COLOR_MAP = {
  info:    'border-blue-500/40  bg-blue-500/10',
  success: 'border-emerald-500/40 bg-emerald-500/10',
  warning: 'border-amber-500/40 bg-amber-500/10',
  error:   'border-red-500/40   bg-red-500/10'
}

export function NotificationToast(): JSX.Element {
  const notifications = useAppStore((s) => s.notifications)
  const remove        = useAppStore((s) => s.removeNotification)

  // Auto-dismiss
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    notifications
      .filter((n) => n.auto !== false)
      .forEach((n) => {
        timers.push(setTimeout(() => remove(n.id), 4000))
      })
    return () => timers.forEach(clearTimeout)
  }, [notifications, remove])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {notifications.map((n) => {
          const Icon = ICON_MAP[n.type]
          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border
                          backdrop-blur-xl ${COLOR_MAP[n.type]}`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.message && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{n.message}</p>
                )}
              </div>
              <button onClick={() => remove(n.id)} className="text-slate-500 hover:text-slate-300">
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
