import { describe, expect, it } from 'vitest'
import { buildReportMd } from './report'
import type { Check, KeywordAnalysis, KeywordInfo, PresetResults, ScoreDeltas } from './types'
import type { ReportData } from './report'

const CHECK: Check = { level: 'warn', mark: 'WARN', label: 'Missing standard section(s): Skills.' }

const KEYWORDS: KeywordInfo[] = [
  { term: 'kubernetes', source: 'skill', count: 2, weight: 1, required: true, preferred: false },
  { term: 'docker', source: 'skill', count: 3, weight: 1, required: true, preferred: false },
]

const KW_RES: KeywordAnalysis = {
  matched: [{ ...KEYWORDS[1] }],
  missing: ['kubernetes'],
  low: [],
  irrelevant: [],
  listOnly: [],
  score: 50,
  total: 2,
  keywordWeight: 2,
}

const DELTAS: ScoreDeltas = {
  deltas: [
    { category: 'keywords', label: 'Keyword match', gain: 20, potential: 78, perfectTotal: 98 },
    { category: 'format', label: 'Format & structure', gain: 6, potential: 64, perfectTotal: 98 },
  ],
  perfectTotal: 98,
}

const BREAKDOWN: PresetResults = {
  presetId: 'workday',
  presetName: 'Workday',
  kwScore: 50,
  fmtScore: 92,
  bulletScore: 86,
  contactScore: 88,
  miscScore: 100,
  total: 64,
  grade: 'Needs work',
}

const baseReport: ReportData = {
  presetName: 'Workday',
  breakdown: BREAKDOWN,
  deltas: DELTAS,
  keywords: KEYWORDS,
  kwRes: KW_RES,
  fmtChecks: [CHECK],
  bulletChecks: [],
  contactChecks: [],
  miscChecks: [],
  localeName: 'United States',
  sourceName: 'strong sample',
  generatedAt: 'Jan 1, 2026, 12:00:00 PM',
}

describe('buildReportMd', () => {
  it('includes score, category table and identity lines', () => {
    const md = buildReportMd(baseReport)
    expect(md).toContain('# ATS Resume Check Report')
    expect(md).toContain('**Preset:** Workday')
    expect(md).toContain('**Locale:** United States')
    expect(md).toContain('**Source:** strong sample')
    expect(md).toContain('## Score: 64/100 — Needs work')
    expect(md).toContain('| Keyword match | 50 |')
    expect(md).toContain('| Work auth & extras | 100 |')
  })

  it('lists missing required keywords and deltas', () => {
    const md = buildReportMd(baseReport)
    expect(md).toContain('**Missing required:** `kubernetes`')
    expect(md).toContain('**Matched (1):** `docker`')
    expect(md).toContain('+20')
    expect(md).toContain('~98/100')
  })

  it('renders check lists and handles null keyword analysis', () => {
    const md = buildReportMd({ ...baseReport, keywords: null, kwRes: null })
    expect(md).toContain('- WARN Missing standard section(s): Skills.')
    expect(md).not.toContain('## Keywords')
  })
})