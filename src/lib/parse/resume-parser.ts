import { SECTION_PATTERNS } from '../analysis/format'
import { countWithAliases, ALL_SKILLS } from '../analysis/keywords'
import type { ExtractedContact } from '../analysis/contact'
import { extractContact } from '../analysis/contact'

export interface ParsedDateRange {
  start: string | null
  end: string | null
  /** inclusive months between start and end, or null when either side is missing */
  months: number | null
}

export interface ParsedRole {
  title: string
  company: string | null
  dateRange: ParsedDateRange
  bullets: string[]
}

export interface ParsedSection {
  name: string
  startLine: number
  endLine: number
}

export interface ParsedResume {
  name: string | null
  contact: ExtractedContact
  sections: ParsedSection[]
  roles: ParsedRole[]
  /** canonical skill -> total months across roles whose bullets mention it */
  skillMonths: Map<string, number>
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const DATE_TOKEN_RE =
  /\b(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})|(\d{1,2})[/.-](\d{4})|((?:19|20)\d{2})[/.](\d{1,2})|((?:19|20)\d{2}))\b/gi
const END_MARKER_RE = /\b(present|current|now|ongoing|to\s+date)\b/gi

interface DatePoint {
  year: number
  month: number
}

function parseDatePoint(text: string): DatePoint | null {
  const m = text.match(DATE_TOKEN_RE)
  if (!m) return null
  const t = m[0].toLowerCase()
  const monthWord = t.match(/^[a-z]+/)?.[0].slice(0, 3)
  const num = t.match(/\d+/g)
  if (!num) return null
  if (monthWord && MONTHS[monthWord]) {
    return { year: Number(num[0]), month: MONTHS[monthWord] }
  }
  const parts = num.map(Number)
  if (parts.length === 2) {
    if (/[/.]/.test(t)) {
      const [a, b] = parts
      return a > 12 ? { year: a, month: b } : { year: b, month: a }
    }
    return { year: parts[0], month: parts[1] }
  }
  return { year: parts[0], month: 1 }
}

function monthsBetween(start: DatePoint, end: DatePoint): number {
  return (end.year - start.year) * 12 + (end.month - start.month) + 1
}

function dateRangeFrom(text: string): ParsedDateRange {
  const toks = text.match(DATE_TOKEN_RE)
  if (!toks || toks.length === 0) return { start: null, end: null, months: null }
  const start = parseDatePoint(toks[0])
  let end: DatePoint | null = null
  if (toks.length >= 2) end = parseDatePoint(toks[toks.length - 1])
  else if (END_MARKER_RE.test(text)) end = null
  return {
    start: toks[0],
    end: toks.length >= 2 ? toks[toks.length - 1] : null,
    months: start && end ? monthsBetween(start, end) : null,
  }
}

function isBulletLine(line: string): boolean {
  return /^\s*([•▪‣●▶»–—-]|\d+[.)])\s*\S/.test(line) || (line.trim().length > 20 && /^[•▪‣●▶\-–—]/.test(line.trim()))
}

const NAME_BLOCKERS = /\b(?:experience|education|skills|summary|projects|@|linkedin|github|http|www\.)\b/i
const TITLE_RE = /(engineer|developer|manager|analyst|designer|consultant|specialist|director|lead|architect|scientist|coordinator|associate|advisor|accountant|nurse|teacher|writer|marketer|intern|vp|ceo|cto|founder|owner|head|principal|staff|officer|executive)/i

function isSectionHeader(line: string): boolean {
  const t = line.trim()
  return t.length <= 40 && SECTION_PATTERNS.some(([, re]) => re.test(t))
}

export function parseName(lines: string[]): string | null {
  for (const raw of lines.slice(0, 12)) {
    const t = raw.trim()
    if (!t || t.length > 40 || NAME_BLOCKERS.test(t) || isBulletLine(raw) || isSectionHeader(t)) continue
    if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(t)) continue
    const words = t.split(/\s+/)
    if (words.length > 5) continue
    const letters = t.replace(/[^A-Za-z]/g, '')
    if (letters.length < 4) continue
    const upper = t.replace(/[^A-Z]/g, '').length
    const titleCase = /^[A-Z][a-z]+(?:[ '-][A-Z][a-z]+){1,3}$/.test(t)
    if (upper / letters.length < 0.35 && !titleCase) continue
    return t.slice(0, 40)
  }
  return null
}

export function parseSections(lines: string[]): ParsedSection[] {
  const sections: ParsedSection[] = []
  let current: ParsedSection | null = null
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t.length > 40) continue
    for (const [name, re] of SECTION_PATTERNS) {
      if (!re.test(t)) continue
      if (current) current.endLine = i - 1
      current = { name, startLine: i, endLine: lines.length - 1 }
      sections.push(current)
      break
    }
  }
  return sections
}

function roleHeaderRange(lines: string[]): [number, number] {
  const sections = parseSections(lines)
  const exp = sections.find((s) => s.name === 'Experience')
  if (exp) return [exp.startLine + 1, exp.endLine]
  const edu = sections.find((s) => s.name === 'Education')
  const end = edu ? edu.startLine : lines.length - 1
  const firstHeader = sections.find((s) => s.name !== 'Experience' && s.startLine < end)
  return [1, firstHeader ? firstHeader.startLine : end]
}

function splitTitleCompany(header: string): { title: string; company: string | null } {
  const parts = header.split(/\s[|\u2502–—-]\s|\s:\s/)
  if (parts.length >= 2) {
    const title = parts[0].trim()
    const company = parts[1].trim()
    const hasDate = /\b(?:19|20)\d{2}\b|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s/i.test(company)
    if (title && company && company.length <= 40 && !hasDate) return { title, company }
  }
  return { title: header, company: null }
}

/** role headers: short capitalized lines with a job title, a separator, or a date */
function roleLikeLine(t: string): boolean {
  if (t.length > 100 || t.endsWith('.') || /^[a-z0-9]/.test(t) || isSectionHeader(t)) return false
  const words = t.split(/\s+/).length
  return words <= 6 && (TITLE_RE.test(t) || /[|,–—:]/.test(t) || /\b\d{4}\b/.test(t))
}

export function parseRoles(lines: string[]): ParsedRole[] {
  const [startIdx, endIdx] = roleHeaderRange(lines)
  const roles: ParsedRole[] = []
  let current: ParsedRole | null = null

  const dateNearby = (fromIdx: number): ParsedDateRange | null => {
    let looked = 0
    for (let i = fromIdx + 1; i <= endIdx && looked < 2; i++) {
      const t = lines[i].trim()
      if (!t) continue
      if (isBulletLine(lines[i])) continue
      if (t.length <= 40 && isSectionHeader(t)) break
      looked++
      if (DATE_TOKEN_RE.test(t)) return dateRangeFrom(t)
    }
    return null
  }

  for (let i = startIdx; i <= endIdx; i++) {
    const raw = lines[i]
    const t = raw.trim()
    if (!t) continue
    if (t.length <= 40 && isSectionHeader(t)) break

    if (isBulletLine(raw)) {
      if (current) current.bullets.push(t.replace(/^[•▪‣●▶»–—-]+\s*|\d+[.)]\s*/, '').trim())
      continue
    }

    if (DATE_TOKEN_RE.test(t)) {
      if (current) roles.push(current)
      const { title, company } = splitTitleCompany(t.slice(0, 80))
      current = { title, company, dateRange: dateRangeFrom(t), bullets: [] }
      continue
    }

    if (roleLikeLine(t)) {
      const range = dateNearby(i)
      if (range || !current) {
        if (current) roles.push(current)
        const { title, company } = splitTitleCompany(t.slice(0, 80))
        current = { title, company, dateRange: range ?? { start: null, end: null, months: null }, bullets: [] }
      }
    }
  }
  if (current) roles.push(current)
  return roles
}

/** months of experience per canonical skill, from role date ranges × bullets mentioning the skill */
export function skillMonths(roles: ParsedRole[]): Map<string, number> {
  const acc = new Map<string, number>()
  for (const role of roles) {
    if (role.dateRange.months === null || role.bullets.length === 0) continue
    const body = role.bullets.join(' ').toLowerCase()
    for (const skill of ALL_SKILLS) {
      if (countWithAliases(body, skill) === 0) continue
      acc.set(skill, (acc.get(skill) ?? 0) + role.dateRange.months)
    }
  }
  return acc
}

export function parseResume(text: string): ParsedResume {
  const lines = text.split(/\r?\n/)
  const roles = parseRoles(lines)
  return {
    name: parseName(lines),
    contact: extractContact(text),
    sections: parseSections(lines),
    roles,
    skillMonths: skillMonths(roles),
  }
}
