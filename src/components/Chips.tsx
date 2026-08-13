export type ChipTone = 'missing' | 'matched' | 'low' | 'neutral'

const TONE_CLASS: Record<ChipTone, string> = {
  missing: 'text-bad border-bad/30 bg-bad/5',
  matched: 'text-good border-good/30 bg-good/5',
  low: 'text-caution border-caution/30 bg-caution/5',
  neutral: 'text-muted border-edge bg-panel2/50',
}

export function Chips({ items, tone }: { items: string[]; tone: ChipTone }) {
  if (items.length === 0) return <p className="text-[13px] text-muted">None</p>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className={`text-[11px] px-1.5 py-0.5 rounded border ${TONE_CLASS[tone]}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

export function KeywordChips({ items }: { items: Array<{ term: string; count: number }> }) {
  if (items.length === 0) return <p className="text-[13px] text-muted">None</p>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((k) => (
        <span key={k.term} className="text-[11px] px-1.5 py-0.5 rounded border border-good/30 text-good bg-good/5">
          {k.term}
          {k.count > 1 && <span className="opacity-60"> ×{k.count}</span>}
        </span>
      ))}
    </div>
  )
}