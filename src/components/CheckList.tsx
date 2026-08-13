import type { Check } from '../lib/types'

const MARK_STYLE: Record<Check['level'], string> = {
  pass: 'text-good',
  warn: 'text-caution',
  fail: 'text-bad',
}

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="space-y-1">
      {checks.map((c, i) => (
        <li key={i} className="flex gap-2 items-start text-[13px] leading-snug">
          <span className={`font-bold text-[10px] w-8 shrink-0 mt-px text-center ${c.mono ? 'text-muted' : MARK_STYLE[c.level]}`}>
            {c.mono ? 'OK' : c.mark}
          </span>
          <span className={c.mono ? 'font-mono text-[11px] text-muted break-all leading-relaxed' : 'text-body/90'}>
            {c.label}
            {c.mono ? ` ${c.mono}` : ''}
          </span>
        </li>
      ))}
    </ul>
  )
}