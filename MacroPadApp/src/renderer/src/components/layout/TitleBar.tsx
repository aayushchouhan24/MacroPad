// =============================================================================
// TitleBar — Custom frameless window controls
// =============================================================================
import { Minus, Square, X } from 'lucide-react'

export function TitleBar(): JSX.Element {
  return (
    <header
      className="h-8 flex items-center justify-between px-3 bg-[#080b12] shrink-0 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <span className="text-[11px] text-slate-600 font-medium tracking-wide">MacroPad</span>
      <div
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.api?.windowMinimize()}
          className="w-10 h-8 flex items-center justify-center text-slate-500
                     hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.api?.windowMaximize()}
          className="w-10 h-8 flex items-center justify-center text-slate-500
                     hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.api?.windowClose()}
          className="w-10 h-8 flex items-center justify-center text-slate-500
                     hover:text-white hover:bg-red-600/80 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  )
}
