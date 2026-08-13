import { describe, expect, it } from 'vitest'
import { extractKeywords, keywordAnalysis, detectResumeSkills } from './keywords'
import { ATS_PRESETS } from '../ats/presets'
import { LOCALES } from '../ats/locales'
import { detectSections, checkFormatting } from './format'
import { checkBullets } from './bullets'
import { checkContact } from './contact'
import { computeScores, gradeFor } from './scoring'
import type { KeywordInfo, LocaleSetting, ResumeSourceMeta } from '../types'

const LOCALE: LocaleSetting = LOCALES.us

const TEXT_SOURCE: ResumeSourceMeta = {
  kind: 'text',
  name: 'pasted text',
  words: 0,
  tableCount: null,
  imgCount: null,
  pageCount: null,
  twoColScore: null,
  interleaved: null,
}

const DIRTY_SOURCE: ResumeSourceMeta = {
  kind: 'docx',
  name: 'dirty.docx',
  words: 0,
  tableCount: 2,
  imgCount: 3,
  pageCount: null,
  twoColScore: null,
  interleaved: null,
}

const RESUME = [
  'JORDAN LEE',
  'San Francisco, CA | (415) 555-0134 | jordan.lee@example.com | linkedin.com/in/jordanlee',
  'Professional Summary',
  'Software engineer with 5+ years of experience building web applications and data pipelines.',
  'Experience',
  'Senior Software Engineer, Acme Corp (2020 - Present)',
  '- Led design and delivery of a realtime analytics dashboard',
  '- Helped with monthly releases',
  '- Worked on migrating legacy services to microservices on AWS',
  '- Responsible for code reviews',
  'Software Engineer, DataWorks (2018 - 2020)',
  '- Built ETL jobs in Python processing 10M records per day',
  '- Improved query performance by 40% by optimizing SQL',
  'Skills',
  'Python, SQL, AWS, Docker, JavaScript, React, Microservices',
  'Education',
  'B.S. Computer Science, University of California (2018)',
].join('\n')

const JD = [
  'Senior Software Engineer - Payments',
  'Design, build, and operate scalable microservices processing millions of transactions per day',
  'Work with SQL and NoSQL databases',
  'Deploy services on AWS, Docker, and Kubernetes',
  '5+ years of software engineering experience',
  'Strong Python and JavaScript skills',
  'Experience building REST APIs and working with React',
  'Microservices architecture and CI/CD pipelines',
  'Excellent communication and stakeholder management skills',
  'Nice to have: PostgreSQL, Kafka, Terraform, incident response',
].join('\n')

describe('keyword extraction', () => {
  it('extracts skill, phrase and repeated terms from a job description', () => {
    const kw = extractKeywords(JD)
    const terms = kw.map((k) => k.term)
    expect(terms).toContain('sql')
    expect(terms).toContain('docker')
    expect(terms).toContain('kubernetes')
    expect(terms).toContain('stakeholder management')
    expect(kw.length).toBeGreaterThan(10)
    expect(kw.length).toBeLessThanOrEqual(45)
  })

  it('caps results at 45 terms', () => {
    const longJd = Array.from({ length: 80 }, (_, i) => `Requirement ${i}: Must know SkillSet${i} and use Tool${i} daily`).join('\n')
    expect(extractKeywords(longJd).length).toBeLessThanOrEqual(45)
  })

  it('collapses alias spellings into the canonical term', () => {
    const jd = ['Requirements:', 'Hands-on Kubernetes, experience with K8s and kube clusters', 'Deep Postgres tuning, plus Postgres replication'].join('\n')
    const kw = extractKeywords(jd)
    const terms = kw.map((k) => k.term)
    expect(terms).toContain('kubernetes')
    expect(terms).not.toContain('k8s')
    expect(terms).toContain('postgresql')
    expect(terms).not.toContain('postgres')
    const kub = kw.find((k) => k.term === 'kubernetes')
    expect(kub?.count).toBeGreaterThanOrEqual(3)
  })
})

describe('keyword analysis', () => {
  const kw = extractKeywords(JD)
  const res = keywordAnalysis(RESUME.toLowerCase(), kw, ATS_PRESETS.workday)

  it('flags known gaps while scoring present skills', () => {
    expect(res.missing).toContain('kubernetes')
    expect(res.missing).toContain('terraform')
    expect(res.matched.some((m) => m.term === 'sql')).toBe(true)
    expect(res.matched.some((m) => m.term === 'docker')).toBe(true)
    expect(res.total).toBe(kw.length)
  })

  it('respects repeated-occurrence requirements of Taleo', () => {
    const taleo = keywordAnalysis(RESUME.toLowerCase(), kw, ATS_PRESETS.taleo)
    for (const low of taleo.low) {
      expect(low.count).toBeLessThan(ATS_PRESETS.taleo.minOccurrences)
    }
  })

  it('matches keywords via aliases in the other direction (JD "k8s", resume "kubernetes")', () => {
    const jd = 'Requirements: k8s, postgres, and GCP'
    const kw = extractKeywords(jd)
    const sel = kw.filter((k) => ['kubernetes', 'postgresql', 'google cloud platform'].includes(k.term))
    expect(sel.length).toBeGreaterThan(1)
    for (const k of sel) expect(k.count).toBeGreaterThan(0)
    const resume = 'Kubernetes admin; also used PostgreSQL and Google Cloud Platform.'
    const res = keywordAnalysis(resume.toLowerCase(), kw, ATS_PRESETS.workday)
    expect(res.missing).not.toContain('kubernetes')
    expect(res.missing).not.toContain('postgresql')
    expect(res.missing).not.toContain('google cloud platform')
  })

  it('recognizes react native, expo, github actions, ci cd and unit testing as skills', () => {
    const jd = `Senior React Native Engineer
Requirements:
- React Native and Expo experience
- CI/CD pipelines with GitHub Actions
- Jest unit testing`

    const resume = `PROFESSIONAL SUMMARY
React Native developer using Expo and TypeScript.
SKILLS
React Native, Expo, TypeScript, Jest, CI/CD, GitHub Actions
WORK EXPERIENCE
Software Engineer — Acme Corp (2020 - Present)
• Wrote unit testing with Jest and CI/CD pipelines for mobile releases.
EDUCATION
B.S. Computer Science`

    const kw = extractKeywords(jd)
    const res = keywordAnalysis(resume.toLowerCase(), kw, ATS_PRESETS.workday)
    for (const want of ['react native', 'expo', 'github actions', 'ci cd', 'unit testing', 'jest']) {
      expect(res.matched.some((m) => m.term === want), `expected "${want}" matched`).toBe(true)
    }
  })

  it('does not flag skills used in bullets as list-only', () => {
    const resume = `PROFESSIONAL SUMMARY
React Native developer.
SKILLS
Jest, CI/CD
WORK EXPERIENCE
Software Engineer — Acme Corp (2020 - Present)
• Wrote unit testing with Jest and CI/CD pipelines for mobile releases.
EDUCATION
B.S. Computer Science`
    const res = keywordAnalysis(resume.toLowerCase(), extractKeywords('Requirements: Jest, CI/CD'), ATS_PRESETS.workday)
    expect(res.listOnly).not.toContain('jest')
    expect(res.listOnly).not.toContain('ci cd')
  })

  it('does not emit JD phrases fully covered by matched skills', () => {
    const jd = 'Requirements: strong TypeScript and Supabase, familiarity with GitHub Actions'
    const kw = extractKeywords(jd)
    const terms = kw.map((k) => k.term)
    expect(terms).not.toContain('strong typescript and supabase')
    expect(terms).not.toContain('familiarity with github actions')
  })

  it('detects resume skills without a JD, collapsing aliases to canonical terms', () => {
    const resume = 'React Native engineer using Expo, TypeScript and CI/CD with Jest and GitHub Actions.'
    const skills = detectResumeSkills(resume)
    const terms = skills.map((s) => s.term)
    expect(terms).toContain('react native')
    expect(terms).toContain('expo')
    expect(terms).toContain('typescript')
    expect(terms).toContain('ci cd')
    expect(terms).toContain('jest')
    expect(terms).toContain('github actions')
    expect(skills.find((s) => s.term === 'react')?.count).toBeGreaterThan(0)
  })
})

describe('section detection', () => {
  it('finds standard sections and ignores the name line', () => {
    const { found, oddHeaders } = detectSections(RESUME)
    expect(found).toEqual(expect.arrayContaining(['Summary', 'Experience', 'Education', 'Skills']))
    expect(oddHeaders).toEqual([])
  })

  it('flags unrecognized all-caps headers after line one', () => {
    const { oddHeaders } = detectSections('Name Line\nWORK JOURNEY\nstuff here\nMORE STUFF\nmore content')
    expect(oddHeaders).toEqual(['WORK JOURNEY', 'MORE STUFF'])
  })
})

describe('formatting checks', () => {
  it('reports tables and images for docx sources', () => {
    const checks = checkFormatting(RESUME, DIRTY_SOURCE)
    expect(checks.some((c) => c.level === 'fail' && /table/i.test(c.label))).toBe(true)
    expect(checks.some((c) => /image/i.test(c.label))).toBe(true)
  })

  it('flags short resumes and missing dates', () => {
    const checks = checkFormatting('Just a name\nand one paragraph without dates or structure.', TEXT_SOURCE)
    expect(checks.some((c) => /short/i.test(c.label))).toBe(true)
    expect(checks.some((c) => /no dates/i.test(c.label))).toBe(true)
  })

  it('accepts clean resumes', () => {
    const checks = checkFormatting(RESUME, TEXT_SOURCE)
    expect(checks.some((c) => c.level === 'fail')).toBe(false)
  })
})

describe('bullet checks', () => {
  it('detects weak openers and metric-less bullets', () => {
    const checks = checkBullets(RESUME)
    const weak = checks.find((c) => /weak phrasing/i.test(c.label))
    const noMetric = checks.find((c) => /lack numbers/i.test(c.label))
    expect(weak?.level).toBe('warn')
    expect(noMetric?.level).toBe('warn')
    expect(checks.some((c) => /responsibilities/i.test(c.label) && c.level === 'fail')).toBe(false)
  })

  it('flags the responsibilities red flag', () => {
    const checks = checkBullets('Role at Company\nResponsibilities:\n- did stuff\n- other stuff')
    expect(checks.some((c) => c.level === 'fail' && /responsibilities/i.test(c.label))).toBe(true)
  })
})

describe('contact checks', () => {
  it('detects complete contact blocks', () => {
    const checks = checkContact(RESUME)
    expect(checks.filter((c) => c.level === 'pass')).toHaveLength(4)
  })

  it('flags missing contact info', () => {
    const checks = checkContact('no contact here at all just prose')
    expect(checks.some((c) => c.level === 'fail')).toBe(true)
    expect(checks.filter((c) => c.level === 'pass')).toHaveLength(0)
  })

  it('accepts international locations like "Muntinlupa City, Philippines"', () => {
    const checks = checkContact('Location: Muntinlupa City, Philippines | Remote')
    expect(checks.find((c) => /location/i.test(c.label))?.level).toBe('pass')
  })

  it('accepts a bare country mention', () => {
    const checks = checkContact('Software Engineer, Manila, Philippines')
    expect(checks.find((c) => /location/i.test(c.label))?.level).toBe('pass')
  })
})

describe('scoring', () => {
  const deps = (keywords: KeywordInfo[] | null, source: ResumeSourceMeta, preset = ATS_PRESETS.workday) => ({
    preset,
    resumeText: RESUME,
    source,
    locale: LOCALE,
    jdText: JD,
    keywords,
  })

  it('grades thresholds correctly', () => {
    expect(gradeFor(90)).toBe('Excellent')
    expect(gradeFor(70)).toBe('Good')
    expect(gradeFor(55)).toBe('Needs work')
    expect(gradeFor(30)).toBe('High risk')
  })

  it('computes a bounded total for every preset', () => {
    const kw = extractKeywords(JD)
    const results = Object.values(ATS_PRESETS).map((p) => computeScores(deps(kw, TEXT_SOURCE, p)))
    for (const r of results) {
      expect(r.total).toBeGreaterThanOrEqual(0)
      expect(r.total).toBeLessThanOrEqual(100)
      expect(r.grade).toBeTruthy()
    }
  })

  it('handles missing job description without keyword weighting', () => {
    const r = computeScores({ ...deps(null, TEXT_SOURCE), jdText: null })
    expect(r.total).toBeGreaterThan(0)
  })

  it('penalizes taleo harder on table-heavy documents', () => {
    const kw = extractKeywords(JD)
    const taleo = computeScores(deps(kw, DIRTY_SOURCE, ATS_PRESETS.taleo))
    const ashby = computeScores(deps(kw, DIRTY_SOURCE, ATS_PRESETS.ashby))
    expect(taleo.total).toBeLessThan(ashby.total)
  })
})