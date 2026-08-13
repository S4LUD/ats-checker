import { useEffect, useRef, useState } from 'react'
import type { GradeLabel } from '../lib/types'

const GRADE_TEXT: Record<GradeLabel, string> = {
  Excellent: 'text-good',
  Good: 'text-good',
  'Needs work': 'text-caution',
  'High risk': 'text-bad',
}

function useCountUp(target: number, ms = 600): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}

export function ScoreRing({ score, grade, note }: { score: number; grade: GradeLabel; note: string }) {
  const shown = useCountUp(score)
  const gradient = `conic-gradient(${grade === 'Excellent' || grade === 'Good' ? '#16a34a' : grade === 'Needs work' ? '#d97706' : '#dc2626'} ${score * 3.6}deg, var(--color-edge) 0deg)`

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center shrink-0"
        style={{ background: gradient }}
        role="img"
        aria-label={`Score ${score} out of 100 — ${grade}`}
      >
        <div className="w-[4.75rem] h-[4.75rem] rounded-full bg-panel border border-edge flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums tracking-tight" aria-hidden="true">
            {shown}
          </span>
          <span className="text-[10px] text-muted">of 100</span>
        </div>
      </div>
      <div className="min-w-52">
        <p className={`text-[13px] font-semibold ${GRADE_TEXT[grade]}`}>{grade}</p>
        <p className="text-[13px] text-muted mt-0.5 max-w-lg leading-snug">{note}</p>
      </div>
    </div>
  )
}