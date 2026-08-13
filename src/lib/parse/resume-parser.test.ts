import { describe, expect, it } from 'vitest'
import { parseName, parseSections, parseRoles, skillMonths, parseResume } from './resume-parser'
import { formatMonths } from '../analysis/normalize'

const RESUME = [
  'Lance Salud',
  'San Francisco, CA | (415) 555-0123 | lance@example.com | linkedin.com/in/lance',
  'Professional Summary',
  'Senior software engineer with 6 years of experience in fintech.',
  'Experience',
  'Senior Software Engineer | Acme Corp | Mar 2021 - Feb 2024',
  '• Built payment APIs with React and TypeScript, cutting p95 latency by 40%.',
  '• Automated CI/CD pipelines with Docker and Kubernetes.',
  '• Scaled PostgreSQL to 4M rows with zero downtime.',
  'Software Engineer | Beta Labs | Jan 2019 - Mar 2021',
  '• Developed Python microservices consumed by 20 internal teams.',
  '• Migrated a legacy REST API to GraphQL, cutting AWS costs by 25%.',
  'Skills',
  'React, TypeScript, Python, PostgreSQL, Docker, Kubernetes, REST APIs, CI/CD, AWS',
  'Education',
  'B.S. Computer Science, State University, 2018',
].join('\n')

describe('parseName', () => {
  it('extracts the name from the first line', () => {
    expect(parseName(RESUME.split('\n'))).toBe('Lance Salud')
  })

  it('skips contact/url lines and section headers', () => {
    const lines = [
      'jordan.lee@example.com | linkedin.com/in/jordan',
      'https://github.com/jordan',
      'Professional Summary',
      'Jordan Lee',
    ]
    expect(parseName(lines)).toBe('Jordan Lee')
  })
})

describe('parseSections', () => {
  it('finds the standard sections in order', () => {
    const names = parseSections(RESUME.split('\n')).map((s) => s.name)
    expect(names).toEqual(['Summary', 'Experience', 'Skills', 'Education'])
  })
})

describe('parseRoles', () => {
  const roles = parseRoles(RESUME.split('\n'))

  it('parses two roles with title/company split', () => {
    expect(roles).toHaveLength(2)
    expect(roles[0].title).toBe('Senior Software Engineer')
    expect(roles[0].company).toBe('Acme Corp')
    expect(roles[1].title).toBe('Software Engineer')
    expect(roles[1].company).toBe('Beta Labs')
  })

  it('captures date ranges and computes months', () => {
    expect(roles[0].dateRange.start).toBe('Mar 2021')
    expect(roles[0].dateRange.end).toBe('Feb 2024')
    expect(roles[0].dateRange.months).toBe(36)
    expect(roles[1].dateRange.months).toBe(27)
  })

  it('collects the bullets per role', () => {
    expect(roles[0].bullets).toHaveLength(3)
    expect(roles[0].bullets[0]).toContain('payment APIs')
    expect(roles[1].bullets).toHaveLength(2)
  })
})

describe('skillMonths', () => {
  it('sums role durations per skill mentioned in bullets', () => {
    const m = skillMonths(parseRoles(RESUME.split('\n')))
    expect(m.get('react')).toBe(36)
    expect(m.get('python')).toBe(27)
    expect(m.get('postgresql')).toBe(36)
    expect(m.get('kubernetes')).toBe(36)
    expect(m.get('aws')).toBe(27)
  })

  it('skips roles without a full date range', () => {
    const lines = ['Experience', 'Dev at Co | 2021 - Present', '• Used Python', 'Skills', 'x']
    const m = skillMonths(parseRoles(lines))
    expect(m.size).toBe(0)
  })
})

describe('parseResume', () => {
  it('returns the full structured model', () => {
    const parsed = parseResume(RESUME)
    expect(parsed.name).toBe('Lance Salud')
    expect(parsed.contact.email).toBe('lance@example.com')
    expect(parsed.contact.phone).not.toBeNull()
    expect(parsed.contact.linkedIn).toBe('linkedin.com/in/lance')
    expect(parsed.contact.location).toBe('San Francisco, CA')
    expect(parsed.roles).toHaveLength(2)
    expect(parsed.sections.length).toBe(4)
  })
})

describe('formatMonths', () => {
  it('formats compact duration labels', () => {
    expect(formatMonths(36)).toBe('~3y')
    expect(formatMonths(27)).toBe('~2.3y')
    expect(formatMonths(5)).toBe('~5mo')
  })
})
