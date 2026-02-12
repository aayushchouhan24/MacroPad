import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

export function EncoderKnob(): JSX.Element {
    const position = useAppStore((s) => s.encoderPosition)
    const btnPressed = useAppStore((s) => s.encoderBtnPressed)
    const angle = position * 15   // 15° per step — accumulates infinitely

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Outer ring */}
            <div
                className={`
          relative w-28 h-28 rounded-full
          bg-[#0e121b] border-2
          flex items-center justify-center
          transition-colors duration-150
          ${btnPressed
                        ? 'border-brand-500 shadow-lg shadow-brand-600/30'
                        : 'border-white/[0.08]'}
        `}
            >
                {/* Tick marks */}
                {Array.from({ length: 12 }, (_, i) => (
                    <div
                        key={i}
                        className="absolute w-0.5 h-2 bg-white/10 rounded-full"
                        style={{
                            top: 4,
                            left: '50%',
                            transformOrigin: '50% 52px',
                            transform: `translateX(-50%) rotate(${i * 30}deg)`
                        }}
                    />
                ))}

                {/* Rotating inner knob */}
                <motion.div
                    animate={{ rotate: angle }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={`
            w-16 h-16 rounded-full bg-[#141a28] border border-white/[0.06]
            flex items-center justify-center relative
            ${btnPressed ? 'bg-brand-700' : ''}
          `}
                >
                    {/* Position indicator dot */}
                    <div
                        className="absolute w-2 h-2 rounded-full bg-brand-400"
                        style={{ top: 6 }}
                    />
                </motion.div>
            </div>

            {/* Step counter (accumulates infinitely) */}
            <div className="text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Steps</p>
                <p className="text-sm font-mono font-semibold text-slate-200">
                    {position}
                </p>
            </div>
        </div>
    )
}
