import type { Check, KeywordAnalysis, KeywordInfo, PresetResults, ScoreDeltas } from './types'

export interface ReportData {
  presetName: string
  breakdown: PresetResults
  deltas: ScoreDeltas
  keywords: KeywordInfo[] | null
  kwRes: KeywordAnalysis | null
  fmtChecks: Check[]
  bulletChecks: Check[]
  contactChecks: Check[]
  miscChecks: Check[]
  localeName: string
  sourceName: string
  generatedAt: string
}

function checkLines(checks: Check[]): string[] {
  return checks.map((c) => `- ${c.mark} ${c.label}`)
}

/** plain-text / Markdown report for export and printing */
export function buildReportMd(data: ReportData): string {
  const { breakdown, deltas, kwRes, keywords } = data
  const lines: string[] = []
  lines.push(`# ATS Resume Check Report`)
  lines.push('')
  lines.push(`- **Preset:** ${data.presetName}`)
  lines.push(`- **Locale:** ${data.localeName}`)
  lines.push(`- **Source:** ${data.sourceName}`)
  lines.push(`- **Generated:** ${data.generatedAt}`)
  lines.push('')
  lines.push(`## Score: ${breakdown.total}/100 — ${breakdown.grade}`)
  lines.push('')
  lines.push('| Category | Score |')
  lines.push('| --- | --- |')
  lines.push(`| Keyword match | ${breakdown.kwScore} |`)
  lines.push(`| Format & structure | ${breakdown.fmtScore} |`)
  lines.push(`| Bullet quality | ${breakdown.bulletScore} |`)
  lines.push(`| Contact info | ${breakdown.contactScore} |`)
  lines.push(`| Work auth & extras | ${breakdown.miscScore} |`)
  lines.push('')
  if (deltas.deltas.length > 0) {
    lines.push(`## If you fix everything: ~${deltas.perfectTotal}/100`)
    const gain = deltas.perfectTotal - breakdown.total
    lines.push('')
    lines.push('Points available by category:')
    for (const d of deltas.deltas) {
      lines.push(`- ${d.label}: +${d.gain}`)
    }
    if (gain > 0) lines.push(`- **Total potential: +${gain}**`)
    lines.push('')
  }
  if (keywords && kwRes) {
    lines.push('## Keywords')
    lines.push('')
    const missing = keywords.filter((k) => kwRes.missing.includes(k.term))
    const required = missing.filter((k) => k.required)
    if (required.length > 0) {
      lines.push(`**Missing required:** ${required.map((k) => `\`${k.term}\``).join(', ')}`)
    }
    if (missing.length > 0) {
      lines.push(`**Other missing:** ${missing.filter((k) => !required.includes(k)).map((k) => `\`${k.term}\``).join(', ')}`)
    }
    if (kwRes.listOnly.length > 0) {
      lines.push(`**Listed but not used in bullets:** ${kwRes.listOnly.map((t) => `\`${t}\``).join(', ')}`)
    }
    if (kwRes.matched.length > 0) {
      lines.push(`**Matched (${kwRes.matched.length}):** ${kwRes.matched.slice(0, 12).map((k) => `\`${k.term}\``).join(', ')}${kwRes.matched.length > 12 ? ', …' : ''}`)
    }
    if (kwRes.semanticHits.length > 0) {
      lines.push(`**Matched semantically (${kwRes.semanticHits.length}):** ${kwRes.semanticHits.slice(0, 12).map((t) => `\`${t}\``).join(', ')}`)
    }
    if (kwRes.inflected.length > 0) {
      lines.push(`**Matched via plurals/stems:** ${kwRes.inflected.slice(0, 12).map((t) => `\`${t}\``).join(', ')}`)
    }
    lines.push('')
  }
  lines.push('## Format & structure')
  lines.push(...checkLines(data.fmtChecks))
  lines.push('')
  lines.push('## Bullets')
  lines.push(...checkLines(data.bulletChecks))
  lines.push('')
  lines.push('## Contact')
  lines.push(...checkLines(data.contactChecks))
  lines.push('')
  lines.push('## Work authorization, location & extras')
  lines.push(...checkLines(data.miscChecks))
  lines.push('')
  lines.push('---')
  lines.push('Heuristic simulator, not affiliated with any ATS vendor. Scores are estimates: no tool can exactly replicate a company\'s parsing and recruiter search behavior.')
  return lines.join('\n')
}

export function downloadReport(md: string, filename = 'ats-resume-report.md'): void {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}