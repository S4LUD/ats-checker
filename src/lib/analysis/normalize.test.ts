import { describe, expect, it } from 'vitest'
import { stemWord, normalizePhrase, phraseForms, isNegated } from './normalize'
import { countSmart, keywordAnalysis, extractKeywords } from './keywords'
import { ATS_PRESETS } from '../ats/presets'

describe('stemWord', () => {
  it('strips plurals and verb endings conservatively', () => {
    expect(stemWord('databases')).toBe('database')
    expect(stemWord('pipelines')).toBe('pipeline')
    expect(stemWord('analytics')).toBe('analytic')
    expect(stemWord('managing')).toBe('manag')
    expect(stemWord('deployed')).toBe('deploy')
    expect(stemWord('and')).toBe('and')
  })

  it('keeps short words untouched', () => {
    expect(stemWord('data')).toBe('data')
    expect(stemWord('api')).toBe('api')
    expect(stemWord('ans')).toBe('ans')
  })
})

describe('phraseForms', () => {
  it('generates space-insensitive and stemmed variants', () => {
    const forms = phraseForms('CI/CD pipelines')
    expect(forms).toContain('ci/cd pipelines')
    expect(forms).toContain('ci cd pipelines')
    expect(forms).toContain('ci/cd pipeline')
  })

  it('normalizes dashes and smart quotes', () => {
    expect(normalizePhrase('“machine learning” – hype')).toBe('machine learning - hype')
  })
})

describe('isNegated', () => {
  it('flags "no experience with X"', () => {
    const text = 'I have no experience with Python.'
    const idx = text.toLowerCase().indexOf('python')
    expect(isNegated(text.toLowerCase(), idx)).toBe(true)
  })

  it('flags "familiar with X" hedging', () => {
    const text = 'Familiar with React but never used it in production.'
    const idx = text.toLowerCase().indexOf('react')
    expect(isNegated(text.toLowerCase(), idx)).toBe(true)
  })

  it('ignores plain positive sentences', () => {
    const text = 'Built production APIs with Python daily.'
    const idx = text.toLowerCase().indexOf('python')
    expect(isNegated(text.toLowerCase(), idx)).toBe(false)
  })

  it('ignores cues too far away from the match', () => {
    const text = 'No experience with databases, but I use Python every day.'
    const idx = text.toLowerCase().indexOf('python')
    expect(isNegated(text.toLowerCase(), idx)).toBe(false)
  })
})

describe('countSmart', () => {
  it('does not count negated mentions', () => {
    const resume = 'No experience with Kubernetes, though I ran Docker for a month.'
    expect(countSmart(resume.toLowerCase(), 'kubernetes').count).toBe(0)
    expect(countSmart(resume.toLowerCase(), 'docker').count).toBe(1)
  })

  it('falls back to inflected forms when the exact term is absent', () => {
    const resume = 'I managed databases and built ETL pipelines.'
    const r = countSmart(resume.toLowerCase(), 'database')
    expect(r.count).toBe(1)
    expect(r.inflected).toBe(true)
  })
})

describe('keyword analysis with smart matching', () => {
  it('moves negated skills to missing', () => {
    const jd = 'Requirements: Kubernetes, Docker, Python'
    const resume = 'I have no experience with Kubernetes. I run Docker in production daily, and Python is my main language.'
    const res = keywordAnalysis(resume.toLowerCase(), extractKeywords(jd), ATS_PRESETS.workday)
    expect(res.missing).toContain('kubernetes')
    expect(res.matched.some((m) => m.term === 'docker')).toBe(true)
    expect(res.matched.some((m) => m.term === 'python')).toBe(true)
  })

  it('matches plural variants of JD terms', () => {
    const jd = 'Requirements: Data Pipeline orchestration'
    const resume = 'Orchestrated data pipelines across staging and production.'
    const res = keywordAnalysis(resume.toLowerCase(), extractKeywords(jd), ATS_PRESETS.workday)
    expect(res.inflected).toContain('data pipeline')
    expect(res.matched.some((m) => m.term === 'data pipeline')).toBe(true)
  })
})
