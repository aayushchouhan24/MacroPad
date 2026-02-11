// =============================================================================
// Sidebar — Material dark icon rail
// =============================================================================
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Keyboard,
  Disc3,
  Layers,
  Settings
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Page } from '@/lib/types'

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'keymapper', label: 'Key Mapper', icon: Keyboard },
  { id: 'encoder',   label: 'Encoder',    icon: Disc3 },
  { id: 'profiles',  label: 'Profiles',   icon: Layers },
  { id: 'settings',  label: 'Settings',   icon: Settings }
]

export function Sidebar(): JSX.Element {
  const active   = useAppStore((s) => s.activePage)
  const setPage  = useAppStore((s) => s.setActivePage)
  const status   = useAppStore((s) => s.connectionStatus)

  return (
    <aside
      className="w-[68px] h-full bg-[#060810] border-r border-border flex flex-col
                 items-center pt-4 pb-4 z-30 shrink-0"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center gap-1 pt-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <div key={id} className="relative group">
              <button
                onClick={() => setPage(id)}
                className={`
                  relative w-11 h-11 rounded-xl flex items-center justify-center
                  transition-all duration-200
                  ${isActive
                    ? 'text-brand-400'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-brand-600/15 border border-brand-500/25 rounded-xl"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={20} className="relative z-10" />
              </button>
              {/* Tooltip */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2
                            px-2.5 py-1 rounded-lg bg-slate-800 border border-border
                            text-xs text-slate-300 font-medium whitespace-nowrap
                            opacity-0 group-hover:opacity-100 pointer-events-none
                            transition-opacity duration-150 z-50">
                {label}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Connection indicator */}
      <div className="flex flex-col items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            status === 'connected'
              ? 'bg-emerald-400 shadow-lg shadow-emerald-400/40'
              : status === 'scanning' || status === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-slate-700'
          }`}
        />
      </div>
    </aside>
  )
}
