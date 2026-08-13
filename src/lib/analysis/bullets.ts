import type { Check } from '../types'

const WEAK_VERBS = [
  'responsible for',
  'responsibilities include',
  'responsibilities:',
  'helped',
  'helped with',
  'help with',
  'worked on',
  'worked with',
  'assisted',
  'assist with',
  'involved in',
  'participated in',
  'participating in',
  'supported',
  'support with',
  'handled',
  'deal with',
  'dealt with',
  'took care of',
  'was in charge of',
  'in charge of',
  'had to',
  'tried to',
  'used to',
  'did some',
  'performed duties',
  'duties included',
  'served as support',
  'worked as part of',
  'assisting',
]

export function checkBullets(resumeText: string): Check[] {
  const checks: Check[] = []
  const bullets = resumeText
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.trim()
      return /^[•▪‣●\-–—]/.test(t) || /^\d+[.)]\s/.test(t)
    })

  const weak: string[] = []
  const noMetric: string[] = []
  const longLines: string[] = []

  for (const line of bullets) {
    const t = line.trim()
    const core = t.replace(/^[•▪‣●\-–—\d.)\s]+/, '').toLowerCase()
    const startsWeak =
      WEAK_VERBS.some((w) => core.startsWith(w)) ||
      (core.includes('responsibilit') && (core.startsWith('responsibilit') || core.startsWith('duties')) && t.length <= 60)
    if (startsWeak) weak.push(t)
    if (!/\d/.test(t)) noMetric.push(t)
    if (t.length > 150) longLines.push(t)
  }

  if (weak.length > 0) {
    checks.push({
      level: 'warn',
      mark: 'WARN',
      label: `${weak.length} bullet(s) start with weak phrasing (e.g. "Helped with", "Worked on", "Responsible for"). Rewrite with strong action verbs: Led, Built, Delivered, Launched, Improved, Reduced.`,
    })
    checks.push({ level: 'warn', mark: 'WARN', label: 'Examples:', mono: weak.slice(0, 4).join(' | ') })
  } else {
    checks.push({ level: 'pass', mark: 'PASS', label: 'No weak-verb openers detected.' })
  }

  const pct = bullets.length > 0 ? Math.round((noMetric.length / bullets.length) * 100) : 0
  if (noMetric.length > 0) {
    checks.push({
      level: 'warn',
      mark: 'WARN',
      label: `${noMetric.length} of ${bullets.length} bullets (${pct}%) lack numbers. Add metrics: "Improved X by 30%", "Reduced cost by $50k/yr", "Led team of 6".`,
    })
    checks.push({ level: 'warn', mark: 'WARN', label: 'Examples:', mono: noMetric.slice(0, 4).join(' | ') })
  } else {
    checks.push({ level: 'pass', mark: 'PASS', label: 'All bullets contain at least one number.' })
  }

  if (longLines.length > 0) {
    checks.push({ level: 'warn', mark: 'WARN', label: `${longLines.length} line(s) exceed 150 chars — split into shorter, scannable bullets.` })
  }

  if (/responsibilities\s*:?/i.test(resumeText)) {
    checks.push({ level: 'fail', mark: 'FAIL', label: '"Responsibilities" header found — the classic ATS red flag. Replace with accomplishment bullets.' })
  }

  if (checks.length === 0) {
    checks.push({ level: 'pass', mark: 'PASS', label: 'Bullet writing looks clean.' })
  }

  return checks
}