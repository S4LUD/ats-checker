import { describe, expect, it } from 'vitest'
import { cosine, semanticMatch, type EmbedFn } from './semantic'

/** bag-of-words embedder over a fixed vocabulary — deterministic for tests */
const VOCAB = ['cloud', 'infra', 'aws', 'infrastructure', 'api', 'docs']
function bagOfWords(text: string): number[] {
  const vec = VOCAB.map(() => 0)
  for (const word of text.toLowerCase().split(/\s+/)) {
    const i = VOCAB.indexOf(word.replace(/[^a-z]/g, ''))
    if (i >= 0) vec[i]++
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  return norm > 0 ? vec.map((v) => v / norm) : vec
}

const embed: EmbedFn = async (texts) => texts.map(bagOfWords)

describe('cosine', () => {
  it('returns 1 for identical vectors and ~0 for orthogonal ones', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1)
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0)
  })
})

describe('semanticMatch', () => {
  it('finds a term that shares meaning with a resume line', async () => {
    const resume = 'Built cloud infra for the payments platform.\nWrote API docs.'
    const hits = await semanticMatch(resume, ['cloud infra'], { embed })
    expect(hits).toHaveLength(1)
    expect(hits[0].term).toBe('cloud infra')
    expect(hits[0].similarity).toBeCloseTo(1)
    expect(hits[0].matchedPhrase).toContain('cloud infra')
  })

  it('respects the similarity threshold', async () => {
    const resume = 'Wrote API docs only.'
    const hits = await semanticMatch(resume, ['cloud infra'], { embed, minSimilarity: 0.9 })
    expect(hits).toHaveLength(0)
  })

  it('returns nothing for empty inputs', async () => {
    expect(await semanticMatch('', ['aws'], { embed })).toEqual([])
    expect(await semanticMatch('Some text here.', [], { embed })).toEqual([])
  })
})
