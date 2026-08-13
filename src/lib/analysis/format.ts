import type { Check, LocaleSetting, ResumeSourceMeta } from '../types'
import { LOCALES } from '../ats/locales'
import { twoColNote } from './column-order'

export const SECTION_PATTERNS: Array<[string, RegExp]> = [
  ['Summary', /^(professional\s+)?(summary|profile|objective|about\s+me|highlights|overview)\s*:?$/i],
  ['Experience', /^(professional\s+)?(work\s+)?(experience|employment\s+history|work\s+history|career\s+history)\s*:?$/i],
  ['Education', /^(education|academic\s+background|academic\s+history|educational\s+background|qualifications|certifications|licenses|credentials)\s*:?$/i],
  ['Skills', /^(technical\s+)?(skills|core\s+competencies|competencies|technologies|tech\s+stack|skill\s+set|languages\s+and\s+technologies)\s*:?$/i],
  ['Projects', /^(projects|personal\s+projects|selected\s+projects|portfolio|open\s+source)\s*:?$/i],
  ['Awards', /^(awards|honors?|achievements|accomplishments|recognition)\s*:?$/i],
  ['Volunteer', /^(volunteer|volunteering|community|community\s+service)\s*:?$/i],
  ['Languages', /^languages?\s*:?$/i],
  ['Publications', /^(publications|papers|research|patents)\s*:?$/i],
]

export interface SectionInfo {
  found: string[]
  oddHeaders: string[]
}

export function detectSections(resumeText: string): SectionInfo {
  const lines = resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const found: string[] = []
  const oddHeaders: string[] = []

  lines.forEach((line, li) => {
    let matched: string | null = null
    for (const [name, re] of SECTION_PATTERNS) {
      if (re.test(line) && line.length <= 40) {
        matched = name
        break
      }
    }
    if (matched) {
      if (!found.includes(matched)) found.push(matched)
      return
    }
    const letters = line.replace(/[^A-Za-z]/g, '')
    if (li === 0 || !letters.length || letters.length > 30 || line.length > 40) return
    const upper = line.replace(/[^A-Z]/g, '').length
    if (upper / letters.length > 0.85) oddHeaders.push(line)
  })

  return { found, oddHeaders: oddHeaders.slice(0, 4) }
}

function wordCount(text: string): number {
  const m = text.trim().match(/\S+/g)
  return m ? m.length : 0
}

export interface ParsedRole {
  header: string
  hasDate: boolean
  hasEndDate: boolean
  raw: string
}

const roleDateRe =
  /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}[/.-]\d{4}|(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current|now|ongoing)|(?:19|20)\d{2}[/.]\d{1,2})\b/gi
const endMarkerRe = /\b(present|current|now|ongoing|to\s+date)\b/gi

function isBulletLine(line: string): boolean {
  return /^\s*([•▪‣●▶»–—-]|\d+[.)])\s*\S/.test(line) || (line.trim().length > 20 && /^[•▪‣●▶\-–—]/.test(line.trim()))
}

/** find role blocks inside the Experience section; dates must live on the role header or within 2 lines of it */
export function parseRoles(resumeText: string): ParsedRole[] {
  const lines = resumeText.split(/\r?\n/)
  const expIdx = lines.findIndex((l) => /^(professional\s+)?(work\s+)?(experience|employment\s+history|work\s+history|career\s+history)\s*:?$/i.test(l.trim()) && l.trim().length <= 40)
  if (expIdx < 0) return []
  const roles: ParsedRole[] = []
  let current: ParsedRole | null = null

  const endSections: Array<[string, RegExp]> = SECTION_PATTERNS.filter(([name]) => name !== 'Experience')
  const titleRe = /(engineer|developer|manager|analyst|designer|consultant|specialist|director|lead|architect|scientist|coordinator|associate|advisor|accountant|nurse|teacher|writer|marketer|intern|vp|ceo|cto|founder|owner|operator|executive|head|principal|staff|ic)/i

  function dateNearby(fromIdx: number): { found: boolean; end: boolean } {
    let looked = 0
    for (let i = fromIdx + 1; i < lines.length && looked < 2; i++) {
      const t = lines[i].trim()
      if (!t) continue
      if (isBulletLine(lines[i])) continue
      if (t.length <= 40 && SECTION_PATTERNS.some(([, re]) => re.test(t))) break
      looked++
      const d = t.match(roleDateRe)
      if (d) return { found: true, end: endMarkerRe.test(t) || d.length >= 2 }
    }
    return { found: false, end: false }
  }

  function roleLikeLine(t: string): boolean {
    if (t.length > 100 || t.endsWith('.') || /^[a-z0-9]/.test(t)) return false
    const words = t.split(/\s+/).length
    return words <= 6 && (titleRe.test(t) || /[|,–—:]/.test(t) || /\b\d{4}\b/.test(t))
  }

  for (let i = expIdx + 1; i < lines.length; i++) {
    const raw = lines[i]
    const t = raw.trim()
    if (!t) continue
    if (t.length <= 40 && endSections.some(([, re]) => re.test(t))) break
    if (isBulletLine(raw)) {
      if (current && !current.hasDate) {
        const d = t.match(roleDateRe)
        if (d) {
          current.hasDate = true
          current.hasEndDate = current.hasEndDate || endMarkerRe.test(t) || d.length >= 2
        }
      }
      continue
    }

    const d = t.match(roleDateRe)
    if (d) {
      if (current) roles.push(current)
      current = { header: t.slice(0, 80), hasDate: true, hasEndDate: endMarkerRe.test(t) || d.length >= 2, raw: t }
      continue
    }

    if (roleLikeLine(t)) {
      const near = dateNearby(i)
      if (near.found || !current) {
        if (current) roles.push(current)
        current = { header: t.slice(0, 80), hasDate: near.found, hasEndDate: near.found ? near.end : false, raw: t }
      }
    }
  }
  if (current) roles.push(current)
  return roles
}

function dateTokens(resumeText: string, locale: LocaleSetting): { words: number; nums: number; years: number; extra: number } {
  const dateReWords = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/gi
  const dateReNum = /\b\d{1,2}[/.-]\d{4}\b/g
  const dateReYear = /\b(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current)\b/gi
  const extra = locale.extraDatePattern ? (resumeText.match(locale.extraDatePattern) ?? []).length : 0
  return {
    words: (resumeText.match(dateReWords) ?? []).length,
    nums: (resumeText.match(dateReNum) ?? []).length,
    years: (resumeText.match(dateReYear) ?? []).length,
    extra,
  }
}

export function checkFormatting(resumeText: string, source: ResumeSourceMeta, locale?: LocaleSetting): Check[] {
  const checks: Check[] = []
  const isPasted = source.kind === 'text' || source.kind === 'example'
  const loc = locale ?? LOCALES.us

  const sections = detectSections(resumeText)
  const required = ['Experience', 'Education', 'Skills']
  const missingReq = required.filter((r) => !sections.found.includes(r))

  if (missingReq.length === 0) {
    checks.push({ level: 'pass', mark: 'PASS', label: `Standard sections found: ${sections.found.join(', ')}.` })
  } else {
    checks.push({ level: 'warn', mark: 'WARN', label: `Missing standard section(s): ${missingReq.join(', ')}. Recruiters expect Experience, Education and Skills.` })
  }

  if (sections.found.includes('Summary')) {
    checks.push({ level: 'pass', mark: 'PASS', label: 'Summary section present.' })
  } else {
    checks.push({ level: 'warn', mark: 'WARN', label: 'No summary/objective section. A 2-3 line summary mirrors the job title and key terms.' })
  }

  if (sections.oddHeaders.length > 0) {
    checks.push({ level: 'warn', mark: 'WARN', label: `Possible non-standard headers: "${sections.oddHeaders.join('", "')}". Use standard names like 'Experience' for best parsing.` })
  }

  const words = wordCount(resumeText)
  if (words < loc.minWords) {
    checks.push({ level: 'warn', mark: 'WARN', label: `Resume is short (${words} words). Typical target is ${loc.minWords}-${loc.maxWords} words for ${loc.name}.` })
  } else if (words > loc.maxWords) {
    checks.push({ level: 'warn', mark: 'WARN', label: `Resume is long (${words} words, likely 2+ pages). Fine for academia/federal, risky elsewhere — ${loc.name} recruiters expect up to ~${loc.maxWords} words.` })
  } else {
    checks.push({ level: 'pass', mark: 'PASS', label: `Length is reasonable: ${words} words (target ${loc.minWords}-${loc.maxWords}).` })
  }

  if (source.tableCount !== null) {
    checks.push(
      source.tableCount > 0
        ? { level: 'fail', mark: 'FAIL', label: `${source.tableCount} table(s) detected in document. Tables are the #1 cause of ATS parsing failure — convert the layout to plain single-column text.` }
        : { level: 'pass', mark: 'PASS', label: 'No tables detected.' },
    )
  }

  if (source.imgCount && source.imgCount > 0) {
    checks.push(
      loc.photoOk
        ? { level: 'pass', mark: 'PASS', label: `${source.imgCount} image(s) detected — normal for ${loc.name} CVs; for ATS uploads keep one small photo or none.` }
        : { level: 'warn', mark: 'WARN', label: `${source.imgCount} image(s) detected. Photos/text-in-images are not parsed by ATS and can get ${loc.name} resumes auto-rejected.` },
    )
  }

  if (source.twoColScore !== null) {
    const pct = Math.round(source.twoColScore * 100)
    const note = twoColNote(source, pct)
    checks.push({ level: note.level, mark: note.level === 'fail' ? 'FAIL' : note.level === 'warn' ? 'WARN' : 'PASS', label: note.label })
  } else if (isPasted) {
    checks.push({ level: 'pass', mark: 'PASS', label: 'Layout check not applicable to pasted text — always upload your final file to verify tables/columns.' })
  } else {
    checks.push({ level: 'pass', mark: 'PASS', label: 'Layout check not applicable to this input type.' })
  }

  const dt = dateTokens(resumeText, loc)

  if (dt.words > 0 && dt.nums > 0 && loc.id !== 'jp') {
    checks.push({ level: 'warn', mark: 'WARN', label: `${dt.words} month-name dates and ${dt.nums} numeric dates found — inconsistent date styles. Pick one format. ${loc.dateFormatNote}.` })
  } else if (dt.words + dt.nums + dt.years + dt.extra === 0) {
    checks.push({ level: 'warn', mark: 'WARN', label: `No dates detected. Every role needs start/end dates (${loc.dateFormatNote}).` })
  } else {
    checks.push({ level: 'pass', mark: 'PASS', label: `Dates present and consistent (${dt.words + dt.nums + dt.years + dt.extra} date token(s)). Expected style for ${loc.name}: ${loc.dateFormatNote}.` })
  }

  const roles = parseRoles(resumeText)
  const rolesWithMissing = roles.filter((r) => !r.hasDate)
  const rolesNoEnd = roles.filter((r) => r.hasDate && !r.hasEndDate)
  const dupes = roles.filter((r, i) => roles.findIndex((o) => o.header.toLowerCase().replace(/[^a-z0-9]/g, '') === r.header.toLowerCase().replace(/[^a-z0-9]/g, '')) !== i)
  if (roles.length > 0) {
    for (const r of rolesWithMissing.slice(0, 3)) {
      checks.push({ level: 'fail', mark: 'FAIL', label: `Role "${r.header}" has no dates. ATS filters on tenure — add start and end dates.` })
    }
    if (rolesWithMissing.length > 3) {
      checks.push({ level: 'fail', mark: 'FAIL', label: `${rolesWithMissing.length - 3} more role(s) missing dates.` })
    }
    for (const r of rolesNoEnd.slice(0, 3)) {
      checks.push({ level: 'warn', mark: 'WARN', label: `Role "${r.header}" has a start date but no end date. Use "Present" for current roles.` })
    }
    for (const d of dupes.slice(0, 2)) {
      checks.push({ level: 'warn', mark: 'WARN', label: `Duplicate role listed: "${d.header}". Merge entries that repeat the same role.` })
    }
    if (rolesWithMissing.length === 0 && rolesNoEnd.length === 0) {
      checks.push({ level: 'pass', mark: 'PASS', label: `${roles.length} role(s) parsed with complete date ranges.` })
    }
  }

  // eslint-disable-next-line no-control-regex
  const specialChars = (resumeText.match(/[^\x00-\x7F\u2010-\u2027\u2039\u203A\u00B7\u00A9\u00AE\u20AC\u00A3\u00A5\u00A7\u00B0\u00B2\u00B3]/g) ?? []).length
  if (specialChars > 5) {
    checks.push({ level: 'warn', mark: 'WARN', label: `${specialChars} unusual characters found (emoji, exotic glyphs, or smart quotes). ATS can mangle these — stick to plain text symbols.` })
  } else {
    checks.push({ level: 'pass', mark: 'PASS', label: specialChars > 0 ? `Special characters within tolerance (${specialChars}).` : 'No exotic characters detected.' })
  }

  const bullets = resumeText
    .split(/\r?\n/)
    .filter((l) => /^\s*([•▪‣●▶–—-]|\d+[.)])\s*\S/.test(l) || (l.trim().length > 20 && /^[•▪‣●▶\-–—]/.test(l.trim())))
  if (bullets.length === 0) {
    checks.push({ level: 'warn', mark: 'WARN', label: 'No bullet points detected. Recruiters (and ATS search) read scannable bullets, not paragraphs.' })
  }

  const jobTitleRe = /(engineer|manager|analyst|developer|designer|consultant|specialist|director|lead|architect|scientist|coordinator|associate|advisor|accountant|nurse|teacher|writer|marketer)/i
  if (!jobTitleRe.test(resumeText)) {
    checks.push({ level: 'warn', mark: 'WARN', label: 'No recognizable job titles found in the resume text.' })
  }

  return checks
}