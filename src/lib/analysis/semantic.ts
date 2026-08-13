/**
 * Semantic keyword matching via a small client-side embedding model
 * (all-MiniLM-L6-v2 through Transformers.js, ~25MB, loaded lazily on demand).
 *
 * The module keeps the heavy import behind a dynamic import so the main bundle
 * never pays for it. Callers may inject an embedder for tests.
 */

export interface SemanticHit {
  term: string
  similarity: number
  /** the resume phrase that matched the JD keyword */
  matchedPhrase: string
}

export type EmbedFn = (texts: string[]) => Promise<number[][]>

let cachedEmbed: EmbedFn | null = null

/** embed a batch of texts; lazily loads the model on first call */
export async function getEmbedder(): Promise<EmbedFn> {
  if (cachedEmbed) return cachedEmbed
  const { pipeline, env } = await import('@huggingface/transformers')
  env.allowLocalModels = false
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  cachedEmbed = async (texts: string[]): Promise<number[][]> => {
    const out = await extractor(texts, { pooling: 'mean', normalize: true })
    return (out as unknown as { tolist: () => number[][] }).tolist()
  }
  return cachedEmbed
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

function chunkResume(resumeText: string): string[] {
  return resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 20 && l.length <= 200)
    .slice(0, 120)
}

/**
 * Find JD keywords that never matched lexically but appear semantically in the
 * resume (e.g. JD says "cloud infra" and the resume says "AWS infrastructure").
 * `minSimilarity` defaults to 0.78 — tuned for all-MiniLM-L6-v2, where
 * paraphrase-level synonyms sit around 0.8 and unrelated terms < 0.5.
 */
export async function semanticMatch(
  resumeText: string,
  terms: string[],
  opts?: { embed?: EmbedFn; minSimilarity?: number },
): Promise<SemanticHit[]> {
  const embed = opts?.embed ?? (await getEmbedder())
  const minSimilarity = opts?.minSimilarity ?? 0.78
  const targets = terms.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 1)
  if (targets.length === 0) return []
  const lines = chunkResume(resumeText)
  if (lines.length === 0) return []

  const lineVecs = await embed(lines)
  const hits: SemanticHit[] = []
  for (let ti = 0; ti < targets.length; ti++) {
    const termVec = (await embed([targets[ti]]))[0]
    let best = -1
    let bestSim = 0
    for (let li = 0; li < lineVecs.length; li++) {
      const sim = cosine(termVec, lineVecs[li])
      if (sim > bestSim) {
        bestSim = sim
        best = li
      }
    }
    if (bestSim >= minSimilarity && best >= 0) {
      hits.push({ term: targets[ti], similarity: bestSim, matchedPhrase: lines[best] })
    }
  }
  return hits
}
