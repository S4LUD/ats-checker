import { describe, expect, it } from 'vitest'
import { itemsToLines, wordCount } from './text'

describe('itemsToLines', () => {
  it('groups items on the same baseline into one line', () => {
    const text = itemsToLines([
      { str: 'PROFESSIONAL', y: 100 },
      { str: 'SUMMARY', y: 100 },
      { str: 'Software', y: 90 },
      { str: 'Engineer', y: 90 },
    ])
    expect(text).toBe('PROFESSIONAL SUMMARY\nSoftware Engineer')
  })

  it('merges baselines within rounding tolerance (0.5)', () => {
    const text = itemsToLines([
      { str: 'SKILLS', y: 120 },
      { str: 'TypeScript', y: 120.5 },
    ])
    expect(text).toBe('SKILLS TypeScript')
  })
})

describe('wordCount', () => {
  it('counts whitespace-separated words across lines', () => {
    expect(wordCount('one two\nthree')).toBe(3)
  })
})