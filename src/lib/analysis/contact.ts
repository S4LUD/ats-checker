import type { Check } from '../types'

const US_LOCATION_RE = /\b[A-Z][a-zA-Z.]+\s*,\s*[A-Z]{2}\b|\b\d{5}(-\d{4})?\b/
const COUNTRY_RE =
  /\b(?:philippines|canada|germany|france|spain|italy|netherlands|belgium|switzerland|sweden|norway|denmark|finland|poland|portugal|ireland|austria|australia|new\s+zealand|singapore|japan|india|brazil|mexico|argentina|chile|colombia|peru|united\s+kingdom|united\s+arab\s+emirates|u\.?k\.?|u\.?a\.?e\.?)\b/i

export interface ExtractedContact {
  email: string | null
  phone: string | null
  linkedIn: string | null
  location: string | null
  github: string | null
}

export function extractContact(text: string): ExtractedContact {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null
  const phone = text.match(/(\+?\d{1,3}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0] ?? null
  const linkedIn = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s,;]+/i)?.[0] ?? null
  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s,;]+/i)?.[0] ?? null
  let location: string | null = null
  const locMatch = text.match(/\b[A-Z][a-zA-Z.]+(?:[ \t]+[A-Z][a-zA-Z.]+){0,2}\s*,\s*[A-Z]{2}\b/)
  if (locMatch) location = locMatch[0]
  else if (COUNTRY_RE.test(text)) location = text.match(COUNTRY_RE)?.[0] ?? null
  else if (/\bremote\b/i.test(text)) location = 'Remote'
  return { email, phone, linkedIn, location, github }
}

export function checkContact(resumeText: string): Check[] {
  const c = extractContact(resumeText)
  const checks: Check[] = []
  checks.push(
    c.email
      ? { level: 'pass', mark: 'PASS', label: 'Email found.' }
      : { level: 'fail', mark: 'FAIL', label: 'No email address found. Some ATS use it as the resume identifier.' },
  )
  checks.push(
    c.phone
      ? { level: 'pass', mark: 'PASS', label: 'Phone number found.' }
      : { level: 'warn', mark: 'WARN', label: 'No phone number found.' },
  )
  checks.push(
    c.linkedIn
      ? { level: 'pass', mark: 'PASS', label: 'LinkedIn URL found.' }
      : { level: 'warn', mark: 'WARN', label: 'No LinkedIn URL found. Recruiters search LinkedIn — link it.' },
  )
  checks.push(
    c.location || US_LOCATION_RE.test(resumeText)
      ? { level: 'pass', mark: 'PASS', label: 'Location found.' }
      : { level: 'warn', mark: 'WARN', label: 'No city/state location found. Add "City, Country" or "Remote" to help recruiter filtering.' },
  )
  return checks
}
