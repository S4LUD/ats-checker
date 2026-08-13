import type { Check, LocaleSetting } from '../types'

const AUTH_TOKENS = [
  'work authorization',
  'work authorisation',
  'authorized to work',
  'authorised to work',
  'eligible to work',
  'legal right to work',
  'right to work in',
  'sponsorship not required',
  'no visa sponsorship',
  'green card',
  'permanent resident',
  ' us citizen',
  'us person',
  ' lpr',
  'h1b',
  'h-1b',
  ' cpt',
  ' opt',
  'tn visa',
  'gc holder',
]

const JD_HARD_SPONSORSHIP = [
  'will not sponsor',
  'no sponsorship',
  'cannot sponsor',
  'unable to sponsor',
  'without sponsorship',
  'no visa sponsorship',
  'not offering sponsorship',
  "won't sponsor",
  'do not provide sponsorship',
  'does not offer sponsorship',
  'cannot provide sponsorship',
  'must be authorized to work',
  'must have work authorization',
  'must be eligible to work',
]

const JD_SOFT_SPONSORSHIP = [
  'sponsorship',
  'work authorization',
  'work authorisation',
  'visa sponsorship',
  'h1b',
  'h-1b',
  'eligible to work',
  'authorization required',
  'visa',
]

const PRIVATE_DATA_PATTERNS: Array<[string, RegExp]> = [
  ['age / date of birth', /\b(?:date\s+of\s+birth|dob|born\s+in|d\.?o\.?b\.?)\b/i],
  ['age', /\b\d{1,2}\s+years?\s+old\b/i],
  ['marital status', /\bmarital\s+status\b/i],
  ['gender', /\bgender[^a-z]/i],
  ['nationality', /\bnationality\b/i],
  ['religion', /\breligion\b/i],
  ['ethnicity / race', /\b(?:ethnicity|race)\b/i],
]

export interface WorkAuthInfo {
  jdMentions: 'hard' | 'soft' | 'none'
  resumeHasAuth: boolean
}

export function workAuthCheck(resumeText: string, jdText: string | null | undefined): WorkAuthInfo {
  const resumeLower = resumeText.toLowerCase()
  const jdLower = (jdText ?? '').toLowerCase()
  const resumeHasAuth = AUTH_TOKENS.some((t) => resumeLower.includes(t))
  if (!jdText || !jdLower.trim()) return { jdMentions: 'none', resumeHasAuth }
  if (JD_HARD_SPONSORSHIP.some((t) => jdLower.includes(t))) return { jdMentions: 'hard', resumeHasAuth }
  if (JD_SOFT_SPONSORSHIP.some((t) => jdLower.includes(t))) return { jdMentions: 'soft', resumeHasAuth }
  return { jdMentions: 'none', resumeHasAuth }
}

const US_CITIES = new Set([
  'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio', 'san diego', 'dallas', 'san jose',
  'austin', 'jacksonville', 'fort worth', 'columbus', 'indianapolis', 'charlotte', 'san francisco', 'seattle', 'denver', 'washington',
  'boston', 'nashville', 'detroit', 'portland', 'atlanta', 'miami', 'minneapolis', 'raleigh', 'salt lake city', 'sacramento',
  'kansas city', 'pittsburgh', 'cincinnati', 'las vegas', 'orlando', 'brooklyn', 'newark', 'palo alto', 'mountain view',
  'menlo park', 'sunnyvale', 'cupertino', 'santa clara', 'redmond', 'bellevue', 'arlington', 'cambridge',
])

function extractCity(text: string): string | null {
  const m = text.match(/\b(?:in|based\s+in|location\s*:?|located\s+in|remote\s+in|near)\s+(?:the\s+)?([a-zA-Z][a-zA-Z\s]{3,30}?)\b(?:\s*,\s*([A-Z]{2}))?/i)
  if (m) {
    const cand = m[1].trim().toLowerCase().replace(/\s+/g, ' ').trim()
    if (cand.endsWith(' area')) return cand.slice(0, -5)
    if (cand.endsWith(' metro')) return cand.slice(0, -6)
    for (const city of US_CITIES) if (cand.startsWith(city) || cand.endsWith(city)) return city
    if (US_CITIES.has(cand)) return cand
  }
  for (const city of US_CITIES) {
    if (new RegExp(`\\b${city.replace(/\s+/g, '\\s+')}\\b`).test(text.toLowerCase())) return city
  }
  return null
}

export function locationCheck(resumeText: string, jdText: string | null | undefined): 'ok' | 'mismatch' | 'na' {
  if (!jdText || !jdText.trim()) return 'na'
  const jdLower = jdText.toLowerCase()
  const jdRemote = /\b(remote|anywhere|fully distributed|work from home)\b/i.test(jdLower)
  const resRemote = /\b(remote|work from home|wfh)\b/i.test(resumeText)
  if (jdRemote && resRemote) return 'ok'
  const jdCity = extractCity(jdText)
  const resCity = extractCity(resumeText)
  if (jdCity && resCity) return jdCity === resCity ? 'ok' : 'mismatch'
  return 'na'
}

export function privateDataCheck(resumeText: string): string[] {
  const hits = new Set<string>()
  for (const [label, re] of PRIVATE_DATA_PATTERNS) {
    if (re.test(resumeText)) hits.add(label)
  }
  return Array.from(hits)
}

export function checkMisc(resumeText: string, jdText: string | null | undefined, locale: LocaleSetting): Check[] {
  const checks: Check[] = []

  const auth = workAuthCheck(resumeText, jdText)
  if (auth.jdMentions === 'hard') {
    checks.push(
      auth.resumeHasAuth
        ? { level: 'pass', mark: 'PASS', label: 'JD says no sponsorship; your resume states you are authorized to work.' }
        : {
            level: 'fail',
            mark: 'FAIL',
            label: 'JD will not sponsor visas, but your resume has no work-authorization line. Add "Authorized to work in the US/EU without sponsorship" if true.',
          },
    )
  } else if (auth.jdMentions === 'soft') {
    checks.push(
      auth.resumeHasAuth
        ? { level: 'pass', mark: 'PASS', label: 'JD mentions sponsorship/authorization; your resume covers it.' }
        : { level: 'warn', mark: 'WARN', label: 'JD mentions sponsorship or work authorization — include an authorization line on your resume if you are eligible.' },
    )
  } else {
    checks.push({ level: 'pass', mark: 'PASS', label: 'No sponsorship/authorization language in the JD to worry about.' })
  }

  const loc = locationCheck(resumeText, jdText)
  if (loc === 'mismatch') {
    checks.push({ level: 'warn', mark: 'WARN', label: 'Resume and JD appear to name different cities. Put your headline location on the contact line (e.g. "San Francisco, CA").' })
  } else if (loc === 'ok') {
    checks.push({ level: 'pass', mark: 'PASS', label: 'Location (or remote preference) lines up with the JD.' })
  } else {
    checks.push({ level: 'pass', mark: 'PASS', label: 'Location check not applicable — no location tokens found in the JD.' })
  }

  const privateHits = privateDataCheck(resumeText)
  if (privateHits.length > 0) {
    checks.push({
      level: 'warn',
      mark: 'WARN',
      label: `Personal data detected: ${privateHits.join(', ')}. Remove protected info (age, marital status, nationality) — it invites bias and may get CVs rejected.`,
    })
  } else {
    checks.push({ level: 'pass', mark: 'PASS', label: 'No protected personal data detected.' })
  }

  if (locale.requireLinkedIn) {
    checks.push(
      /\blinkedin\.com\/in\//i.test(resumeText)
        ? { level: 'pass', mark: 'PASS', label: 'LinkedIn URL present.' }
        : { level: 'warn', mark: 'WARN', label: 'No LinkedIn URL found — US recruiters expect one.' },
    )
  }

  return checks
}