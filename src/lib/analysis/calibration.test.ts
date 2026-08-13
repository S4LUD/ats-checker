import { describe, expect, it } from 'vitest'
import { extractKeywords, keywordAnalysis } from './keywords'
import { checkFormatting } from './format'
import { checkBullets } from './bullets'
import { checkContact } from './contact'
import { computeScores } from './scoring'
import { ATS_PRESETS, PRESET_IDS } from '../ats/presets'
import { LOCALES } from '../ats/locales'
import type { ResumeSourceMeta } from '../types'

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

const JD = [
  'About us',
  'Acme Corp builds fintech software for banks.',
  'Requirements',
  'React, TypeScript, Python, REST APIs, CI/CD, Docker, Kubernetes, PostgreSQL. Minimum 4 years of Python.',
  'Responsibilities',
  'Build and maintain APIs. Improve CI/CD pipelines. Scale PostgreSQL databases.',
  'Nice to have',
  'Machine learning, AWS, Terraform.',
].join('\n')

const STRONG_RESUME = [
  'Lance Salud',
  'San Francisco, CA | (415) 555-0123 | lance@example.com | linkedin.com/in/lance',
  'Professional Summary',
  'Senior software engineer with 6 years of experience in fintech.',
  'Experience',
  'Senior Software Engineer | Acme Corp | Mar 2021 - Feb 2024',
  '• Built payment APIs with React and TypeScript, cutting p95 latency by 40%.',
  '• Automated CI/CD pipelines with Docker and Kubernetes, reducing deploys by 60%.',
  '• Scaled PostgreSQL to 4M rows with zero downtime.',
  'Software Engineer | Beta Labs | Jan 2019 - Mar 2021',
  '• Developed Python microservices consumed by 20 internal teams.',
  '• Migrated a legacy REST API to GraphQL, cutting AWS costs by 25%.',
  'Skills',
  'React, TypeScript, Python, PostgreSQL, Docker, Kubernetes, REST APIs, CI/CD, AWS, Machine Learning',
  'Education',
  'B.S. Computer Science, State University, 2018',
].join('\n')

const WEAK_RESUME = [
  'my resume',
  'I did some software work. I worked on things related to Python and React but mostly I was in charge of supporting the team.',
  'We used databases and stuff. It was good. I liked it a lot and participated in many meetings.',
  'I have no experience with Kubernetes or Docker though I am familiar with their basics.',
  'My last job was at a company. I handled many duties and responsibilities which were important. We did a lot of things.',
].join('\n')

function depsFor(resume: string, preset = ATS_PRESETS.auto) {
  const keywords = extractKeywords(JD)
  const kwRes = keywordAnalysis(resume.toLowerCase(), keywords, preset)
  const source = TEXT_SOURCE
  return {
    base: { preset, resumeText: resume, source, locale: LOCALES.global, jdText: JD, keywords },
    kwRes,
    fmtChecks: checkFormatting(resume, source, LOCALES.global),
    bulletChecks: checkBullets(resume),
    contactChecks: checkContact(resume),
  }
}

describe('calibration: golden set ordering', () => {
  it('scores a clean, keyword-aligned resume above a weak one for every preset', () => {
    for (const id of PRESET_IDS) {
      const preset = ATS_PRESETS[id]
      const strong = computeScores(depsFor(STRONG_RESUME, preset).base)
      const weak = computeScores(depsFor(WEAK_RESUME, preset).base)
      expect(strong.total, `preset ${id}: strong ${strong.total} should beat weak ${weak.total}`).toBeGreaterThan(weak.total)
    }
  })

  it('strong resume beats weak on every category', () => {
    const s = depsFor(STRONG_RESUME)
    const w = depsFor(WEAK_RESUME)
    const strong = computeScores(s.base)
    const weak = computeScores(w.base)
    expect(strong.kwScore).toBeGreaterThan(weak.kwScore)
    expect(strong.fmtScore).toBeGreaterThan(weak.fmtScore)
    expect(strong.bulletScore).toBeGreaterThan(weak.bulletScore)
    expect(strong.contactScore).toBeGreaterThan(weak.contactScore)
    expect(strong.miscScore).toBeGreaterThanOrEqual(weak.miscScore)
  })

  it('negation-aware matching keeps "no experience with X" out of the matched set', () => {
    const w = depsFor(WEAK_RESUME)
    expect(w.kwRes.missing).toContain('kubernetes')
    expect(w.kwRes.missing).toContain('docker')
  })

  it('inflection matching counts "databases" toward the JD term "database"', () => {
    const s = depsFor(STRONG_RESUME)
    expect(s.kwRes.matched.some((m) => m.term === 'postgresql')).toBe(true)
    expect(s.kwRes.matched.some((m) => m.term === 'rest api')).toBe(true)
  })
})

describe('calibration: monotonic fixes', () => {
  const bare = 'Work at a company doing stuff.'

  it('adding contact info strictly raises the contact score', () => {
    const before = computeScores(depsFor(bare).base).contactScore
    const after = computeScores(depsFor(`${bare}\nJohn Doe | jd@example.com | 555-1234 | San Francisco, CA`).base).contactScore
    expect(after).toBeGreaterThan(before)
  })

  it('adding role dates strictly raises the format score', () => {
    const noDates = ['Experience', 'Software Engineer, Acme Corp', '- did things'].join('\n')
    const withDates = ['Experience', 'Software Engineer, Acme Corp | Jan 2020 - Present', '- did things'].join('\n')
    const before = computeScores(depsFor(noDates).base).fmtScore
    const after = computeScores(depsFor(withDates).base).fmtScore
    expect(after).toBeGreaterThan(before)
  })

  it('adding JD keywords strictly raises the keyword score', () => {
    const kw = extractKeywords(JD)
    const before = computeScores({ ...depsFor('I built things with Express.').base, keywords: kw, kwRes: undefined })
    const after = computeScores({
      ...depsFor('I built things with Express. I use React, TypeScript, Python, PostgreSQL, Docker, Kubernetes and CI/CD daily, plus REST APIs.').base,
      keywords: kw,
      kwRes: undefined,
    })
    expect(after.kwScore).toBeGreaterThan(before.kwScore)
  })

  it('all scores stay within 0-100 for pathological input', () => {
    const r = computeScores(depsFor('x'.repeat(3000)).base)
    for (const key of ['kwScore', 'fmtScore', 'bulletScore', 'contactScore', 'miscScore', 'total'] as const) {
      expect(r[key]).toBeGreaterThanOrEqual(0)
      expect(r[key]).toBeLessThanOrEqual(100)
    }
  })
})
