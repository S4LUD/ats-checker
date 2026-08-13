export type CheckLevel = 'pass' | 'warn' | 'fail'

export interface Check {
  level: CheckLevel
  mark: 'PASS' | 'WARN' | 'FAIL'
  label: string
  mono?: string
}

export type KeywordSource = 'skill' | 'phrase' | 'repeated'

export interface KeywordInfo {
  term: string
  source: KeywordSource
  count: number
  /** JD importance 0..1 — 1 = required/qualifications section, 0.5 = nice-to-have */
  weight: number
  required: boolean
  preferred: boolean
}

export interface KeywordSuggestion {
  term: string
  action: string
  required: boolean
}

export interface KeywordAnalysis {
  matched: KeywordInfo[]
  missing: string[]
  low: KeywordInfo[]
  irrelevant: string[]
  /** matched terms that only appear in a skills-list section, never in a bullet — stuffing signal */
  listOnly: string[]
  score: number
  total: number
  keywordWeight: number
}

export type PresetId = 'auto' | 'workday' | 'greenhouse' | 'taleo' | 'lever' | 'icims' | 'ashby'

export interface AtsPreset {
  id: PresetId
  name: string
  weights: { keyword: number; format: number; bullet: number; contact: number }
  minOccurrences: number
  tablePenalty: number
  twoColPenalty: number
  standardsMissingPenalty: number
  tips: string[]
}

export type ResumeSourceKind = 'text' | 'pdf' | 'docx' | 'txt' | 'example'

export interface ResumeSourceMeta {
  kind: ResumeSourceKind
  name: string
  words: number
  tableCount: number | null
  imgCount: number | null
  pageCount: number | null
  twoColScore: number | null
  /** true when a two-column PDF emits text column-by-column, scrambling read order */
  interleaved: boolean | null
}

export type LocaleId = 'us' | 'eu' | 'jp' | 'global'

export interface LocaleSetting {
  id: LocaleId
  name: string
  flag: string
  /** resumes in this region commonly include a photo — no penalty for images */
  photoOk: boolean
  minWords: number
  maxWords: number
  /** example of the expected date style for this region */
  dateFormatNote: string
  /** extra date token pattern used in this region (e.g. YYYY/MM for Japan) */
  extraDatePattern?: RegExp
  requireLinkedIn: boolean
}

export interface ScoreBreakdown {
  kwScore: number
  fmtScore: number
  bulletScore: number
  contactScore: number
  miscScore: number
  total: number
}

export interface PresetResults extends ScoreBreakdown {
  presetId: PresetId
  presetName: string
  grade: GradeLabel
}

export type GradeLabel = 'Excellent' | 'Good' | 'Needs work' | 'High risk'

export type ScoreCategory = 'keywords' | 'format' | 'bullets' | 'contact' | 'misc'

export interface ScoreDeps {
  preset: AtsPreset
  resumeText: string
  keywords: KeywordInfo[] | null
  source: ResumeSourceMeta
  locale: LocaleSetting
  jdText?: string | null
  kwRes?: KeywordAnalysis | null
  /** recompute the total as if these categories were perfect, for "what would fixing this get me" */
  perfect?: Partial<Record<ScoreCategory, boolean>>
}

export interface ScoreDelta {
  category: ScoreCategory
  label: string
  gain: number
  potential: number
  perfectTotal: number
}

export interface ScoreDeltas {
  deltas: ScoreDelta[]
  perfectTotal: number
}