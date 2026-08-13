import type { Check } from '../types'

const US_LOCATION_RE = /\b[A-Z][a-zA-Z.]+\s*,\s*[A-Z]{2}\b|\b\d{5}(-\d{4})?\b/
const LOCATION_PREFIX_RE = /location\s*[:|]/i
const COUNTRY_RE =
  /\b(?:philippines|canada|germany|france|spain|italy|netherlands|belgium|switzerland|sweden|norway|denmark|finland|poland|portugal|ireland|austria|australia|new\s+zealand|singapore|japan|india|brazil|mexico|argentina|chile|colombia|peru|united\s+kingdom|united\s+arab\s+emirates|u\.?k\.?|u\.?a\.?e\.?)\b/i

export function checkContact(resumeText: string): Check[] {
  const checks: Check[] = []

  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(resumeText)) {
    checks.push({ level: 'pass', mark: 'PASS', label: 'Email found.' })
  } else {
    checks.push({ level: 'fail', mark: 'FAIL', label: 'No email address found. Some ATS use it as the resume identifier.' })
  }

  if (/(\+?\d{1,3}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/.test(resumeText)) {
    checks.push({ level: 'pass', mark: 'PASS', label: 'Phone number found.' })
  } else {
    checks.push({ level: 'warn', mark: 'WARN', label: 'No phone number found.' })
  }

  if (/linkedin\.com/i.test(resumeText)) {
    checks.push({ level: 'pass', mark: 'PASS', label: 'LinkedIn URL found.' })
  } else {
    checks.push({ level: 'warn', mark: 'WARN', label: 'No LinkedIn URL found. Recruiters search LinkedIn — link it.' })
  }

  if (US_LOCATION_RE.test(resumeText) || LOCATION_PREFIX_RE.test(resumeText) || COUNTRY_RE.test(resumeText)) {
    checks.push({ level: 'pass', mark: 'PASS', label: 'Location found.' })
  } else {
    checks.push({ level: 'warn', mark: 'WARN', label: 'No city/state location found. Add "City, Country" or "Remote" to help recruiter filtering.' })
  }

  return checks
}