import type { PresetResults } from '../lib/types'

const GRADE_TEXT: Record<string, string> = {
  Excellent: 'text-good',
  Good: 'text-good',
  'Needs work': 'text-caution',
  'High risk': 'text-bad',
}

export function CompareTable({ results }: { results: PresetResults[] }) {
  const best = Math.max(...results.map((r) => r.total))
  const worst = Math.min(...results.map((r) => r.total))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted">
            <th className="text-left py-1.5 pr-3 font-medium">ATS system</th>
            <th className="text-right py-1.5 px-2 font-medium tabular-nums">Keyword</th>
            <th className="text-right py-1.5 px-2 font-medium tabular-nums">Format</th>
            <th className="text-right py-1.5 px-2 font-medium tabular-nums">Bullets</th>
            <th className="text-right py-1.5 px-2 font-medium tabular-nums">Contact</th>
            <th className="text-right py-1.5 px-2 font-medium tabular-nums">Total</th>
            <th className="text-left py-1.5 pl-3 font-medium">Grade</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.presetId} className="border-t border-edge/70">
              <td className="py-1.5 pr-3">{r.presetName}</td>
              <td className="text-right py-1.5 px-2 tabular-nums text-muted">{r.kwScore}</td>
              <td className="text-right py-1.5 px-2 tabular-nums text-muted">{r.fmtScore}</td>
              <td className="text-right py-1.5 px-2 tabular-nums text-muted">{r.bulletScore}</td>
              <td className="text-right py-1.5 px-2 tabular-nums text-muted">{r.contactScore}</td>
              <td
                className={`text-right py-1.5 px-2 font-semibold tabular-nums ${
                  best !== worst && r.total === best ? 'text-good' : best !== worst && r.total === worst ? 'text-bad' : ''
                }`}
              >
                {r.total}
              </td>
              <td className={`py-1.5 pl-3 font-medium ${GRADE_TEXT[r.grade] ?? 'text-muted'}`}>{r.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}