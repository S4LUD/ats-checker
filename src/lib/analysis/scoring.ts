import type { AtsPreset, Check, GradeLabel, PresetResults, ScoreCategory, ScoreDelta, ScoreDeps, ScoreDeltas } from '../types'
import { keywordAnalysis } from './keywords'
import { checkFormatting } from './format'
import { checkBullets } from './bullets'
import { checkContact } from './contact'
import { checkMisc } from './misc'
import { RUBRIC } from './rubric'

export function gradeFor(total: number): GradeLabel {
  if (total >= 85) return 'Excellent'
  if (total >= 70) return 'Good'
  if (total >= 50) return 'Needs work'
  return 'High risk'
}

export function formatScore(checks: Check[], preset: AtsPreset): number {
  let penalty = 0
  for (const c of checks) {
    if (c.mono) continue
    if (c.level === 'fail') {
      penalty += /table/i.test(c.label) ? preset.tablePenalty : RUBRIC.format.fail
    } else if (c.level === 'warn') {
      penalty += RUBRIC.format.warn
    }
  }
  return Math.max(0, Math.min(100, 100 - penalty))
}

export function bulletScore(checks: Check[]): number {
  let penalty = 0
  for (const c of checks) {
    if (c.mono) continue
    penalty += c.level === 'fail' ? RUBRIC.bullets.fail : c.level === 'warn' ? RUBRIC.bullets.warn : 0
  }
  return Math.max(0, Math.min(100, 100 - penalty))
}

export function contactScore(checks: Check[]): number {
  const misses = checks.filter((c) => !c.mono && c.level !== 'pass').length
  return Math.max(0, Math.min(100, 100 - misses * RUBRIC.contact.miss))
}

export function miscScore(checks: Check[]): number {
  let penalty = 0
  for (const c of checks) {
    if (c.mono) continue
    penalty += c.level === 'fail' ? RUBRIC.misc.fail : c.level === 'warn' ? RUBRIC.misc.warn : 0
  }
  return Math.max(0, Math.min(100, 100 - penalty))
}

/** weighted keyword coverage: required keywords dominate, list-only matches count 85%, under-used count 50% */
export function keywordCoverage(deps: Pick<ScoreDeps, 'kwRes' | 'keywords'>): number | null {
  if (!deps.kwRes) return null
  const kwRes = deps.kwRes
  let covered = 0
  for (const kw of kwRes.matched) covered += kw.weight * (kwRes.listOnly.includes(kw.term) ? 0.85 : 1)
  for (const kw of kwRes.low) covered += kw.weight * 0.5
  return kwRes.keywordWeight > 0 ? (covered / kwRes.keywordWeight) * 100 : 0
}

function computeCategoryScores(deps: ScoreDeps): { kwScore: number; fmtScore: number; bulletScore: number; contactScore: number; miscScore: number; kwRes: ReturnType<typeof keywordAnalysis> | null; fmtChecks: Check[]; bulletChecks: Check[]; contactChecks: Check[]; miscChecks: Check[] } {
  const perfect = deps.perfect ?? {}

  const kwRes = deps.kwRes ?? (deps.keywords ? keywordAnalysis(deps.resumeText.toLowerCase(), deps.keywords, deps.preset) : null)

  let kwScore: number
  if (perfect.keywords) {
    kwScore = 100
  } else if (!deps.keywords || !kwRes) {
    kwScore = 70
  } else {
    kwScore = keywordCoverage({ kwRes, keywords: deps.keywords }) ?? 70
  }

  const fmtChecks = perfect.format ? [] : checkFormatting(deps.resumeText, deps.source, deps.locale)
  const bulletChecks = perfect.bullets ? [] : checkBullets(deps.resumeText)
  const contactChecks = perfect.contact ? [] : checkContact(deps.resumeText)
  const miscChecks = perfect.misc ? [] : checkMisc(deps.resumeText, deps.jdText, deps.locale)

  const fmt = formatScore(fmtChecks, deps.preset)
  const bullet = bulletScore(bulletChecks)
  const contact = contactScore(contactChecks)
  const misc = miscScore(miscChecks)
  return { kwScore, fmtScore: fmt, bulletScore: bullet, contactScore: contact, miscScore: misc, kwRes, fmtChecks, bulletChecks, contactChecks, miscChecks }
}

export function computeScores(deps: ScoreDeps): PresetResults {
  const s = computeCategoryScores(deps)

  const w = deps.preset.weights
  const miscW = Math.max(0, 100 - w.keyword - w.format - w.bullet - w.contact)

  const total = Math.round((s.kwScore * w.keyword + s.fmtScore * w.format + s.bulletScore * w.bullet + s.contactScore * w.contact + s.miscScore * miscW) / 100)
  const clamped = Math.max(0, Math.min(100, total))

  return {
    presetId: deps.preset.id,
    presetName: deps.preset.name,
    kwScore: Math.round(s.kwScore),
    fmtScore: s.fmtScore,
    bulletScore: s.bulletScore,
    contactScore: s.contactScore,
    miscScore: s.miscScore,
    total: clamped,
    grade: gradeFor(clamped),
  }
}

const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  keywords: 'Keyword match',
  format: 'Format & structure',
  bullets: 'Bullet quality',
  contact: 'Contact info',
  misc: 'Work auth & extras',
}

export function computeScoreDeltas(deps: ScoreDeps): ScoreDeltas {
  const base = computeScores(deps)
  if (!deps.keywords) {
    return { deltas: [], perfectTotal: base.total }
  }
  const cats: ScoreCategory[] = ['keywords', 'format', 'bullets', 'contact', 'misc']
  const allPerfect = Object.fromEntries(cats.map((c) => [c, true])) as Partial<Record<ScoreCategory, boolean>>
  const perfectTotal = computeScores({ ...deps, perfect: allPerfect }).total
  const deltas: ScoreDelta[] = []
  for (const cat of cats) {
    const perfectScore = computeScores({ ...deps, perfect: { [cat]: true } })
    const gain = Math.max(0, perfectScore.total - base.total)
    if (gain > 0) {
      deltas.push({ category: cat, label: CATEGORY_LABELS[cat], gain, potential: perfectScore.total, perfectTotal })
    }
  }
  return { deltas, perfectTotal }
}

export interface AnalysisBundle {
  breakdown: PresetResults
  deltas: ScoreDeltas
  kwRes: ReturnType<typeof keywordAnalysis> | null
  fmtChecks: Check[]
  bulletChecks: Check[]
  contactChecks: Check[]
  miscChecks: Check[]
}

export function analyze(deps: ScoreDeps): AnalysisBundle {
  return {
    breakdown: computeScores(deps),
    deltas: computeScoreDeltas(deps),
    kwRes: deps.kwRes ?? (deps.keywords ? keywordAnalysis(deps.resumeText.toLowerCase(), deps.keywords, deps.preset) : null),
    fmtChecks: checkFormatting(deps.resumeText, deps.source, deps.locale),
    bulletChecks: checkBullets(deps.resumeText),
    contactChecks: checkContact(deps.resumeText),
    miscChecks: checkMisc(deps.resumeText, deps.jdText, deps.locale),
  }
}

export function compareAcrossPresets(deps: Pick<ScoreDeps, 'resumeText' | 'source' | 'locale' | 'jdText' | 'keywords'> & { presets: AtsPreset[] }): PresetResults[] {
  return deps.presets.map((preset) => computeScores({ ...deps, preset }))
}