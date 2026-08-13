/**
 * Lightweight text normalization for keyword matching.
 *
 * Not a full stemmer — deliberately conservative: we only merge inflectional
 * variants (plurals, common verb endings) when the base form stays >= 4 chars,
 * so distinct words (e.g. "rest" vs "resting") are never collapsed wrongly.
 */

/** strip plural/verb inflections from a single word */
export function stemWord(word: string): string {
  const w = word.toLowerCase()
  if (w.length < 6) return w
  if (/ies$/.test(w)) return `${w.slice(0, -3)}y`
  if (/ing$/.test(w)) {
    const base = w.slice(0, -3)
    if (base.length >= 4) return base
  }
  if (/ed$/.test(w)) {
    const base = w.slice(0, -2)
    if (base.length >= 4 && !/^(and|end|led|red)$/.test(base)) return base
  }
  if (/s$/.test(w) && !/ss$/.test(w)) {
    const base = w.slice(0, -1)
    if (base.length >= 4) return base
  }
  return w
}

/** normalize a whole phrase: lowercase, keep alnum+.-+#/, drop stopword-ish fillers for matching */
export function normalizePhrase(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9+#.\-/ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** every normalized token form for a phrase, for matching a document phrase against it */
export function phraseForms(phrase: string): string[] {
  const forms = new Set<string>()
  const norm = normalizePhrase(phrase)
  forms.add(norm)
  if (norm.includes(' ')) {
    forms.add(norm.replace(/[.\-+/]+/g, ' ').replace(/\s+/g, ' ').trim())
  }
  const stemmed = norm
    .split(' ')
    .map(stemWord)
    .filter((t) => t.length > 1)
    .join(' ')
  forms.add(stemmed)
  return Array.from(forms)
}

/** negation / hedging cues that flip the meaning of a nearby term */
const NEGATION_CUES = [
  'no experience',
  'no hands-on',
  'no prior',
  'no direct',
  'no formal',
  'no professional',
  'no exposure',
  'not familiar',
  'never used',
  'never worked',
  'without any',
  'lack of',
  'lacking',
  'basic knowledge',
  'basics of',
  'introductory',
  'theoretical knowledge',
  'academic exposure',
  'classroom setting',
  'familiar with',
  'exposure to',
  'working knowledge',
  'aware of',
  'beginner',
  'entry-level understanding',
]

/**
 * true when a negation cue appears within `window` words *before* a match
 * (e.g. "no experience with Python", "familiar with React"). Cues never
 * cross sentence boundaries.
 */
export function isNegated(text: string, matchIndex: number, window = 6): boolean {
  const before = text.slice(Math.max(0, matchIndex - 200), matchIndex).split(/[.!?;]\s+/).pop() ?? ''
  const words = before
    .split(/\s+/)
    .filter(Boolean)
    .slice(-window)
    .join(' ')
  return NEGATION_CUES.some((cue) => words.includes(cue))
}

/** compact duration label for a month count, e.g. 38 -> "~3.1y" */
export function formatMonths(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y > 0) return m > 0 ? `~${y}.${Math.round((m / 12) * 10)}y` : `~${y}y`
  return m > 0 ? `~${m}mo` : '<1mo'
}
