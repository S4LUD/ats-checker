import type { ResumeSourceMeta } from '../types'

export interface StreamItem {
  x: number
  y: number
}

export interface ColumnAnalysis {
  /** fraction of lines starting in the right-hand 38-80% band, same metric as before */
  twoColScore: number | null
  /** true when a two-column layout emits text column-by-column, scrambling read order */
  interleaved: boolean | null
}

/**
 * Decide whether a PDF's text stream is visually ordered (row-major) or column-by-column.
 *
 * In a clean single-column or row-major two-column PDF, the text objects of one visual
 * line are adjacent in the stream (small "stream gap" between the left and right cluster).
 * In a column-by-column stream the left column of many lines is emitted before the right
 * column, so the left/right clusters of a visual line are far apart in the stream and the
 * extracted text reads in the wrong order.
 */
export function detectColumnOrder(items: StreamItem[], width: number): ColumnAnalysis {
  const sorted = [...items].sort((a, b) => a.y - b.y)
  const lines = new Map<number, StreamItem[]>()
  for (const it of sorted) {
    const key = Math.round(it.y * 2) / 2
    const bucket = lines.get(key)
    if (bucket) bucket.push(it)
    else lines.set(key, [it])
  }

  const lineItems = Array.from(lines.values()).filter((ln) => ln.length >= 1)

  const rightBand = width * 0.38
  let rightStarts = 0
  for (const items_ of lineItems) {
    const minX = Math.min(...items_.map((i) => i.x))
    if (minX >= rightBand && minX < width * 0.8) rightStarts++
  }
  const twoColScore = lineItems.length > 0 ? rightStarts / lineItems.length : null

  const gapThreshold = width * 0.16
  const streamGaps: number[] = []
  const itemOrder = new Map<StreamItem, number>()
  items.forEach((it, idx) => itemOrder.set(it, idx))

  for (const ln of lineItems) {
    const ordered = [...ln].sort((a, b) => a.x - b.x)
    const cuts: number[] = [0]
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i].x - ordered[i - 1].x > gapThreshold) cuts.push(i)
    }
    cuts.push(ordered.length)
    for (let c = 1; c < cuts.length; c++) {
      const cluster = ordered.slice(cuts[c - 1], cuts[c])
      const prevStart = c > 1 ? cuts[c - 2] : 0
      const leftIdx = Math.max(...ordered.slice(prevStart, cuts[c - 1]).map((it) => itemOrder.get(it) ?? -1))
      const rightIdx = Math.min(...cluster.map((it) => itemOrder.get(it) ?? Number.MAX_SAFE_INTEGER))
      if (leftIdx >= 0 && rightIdx < Number.MAX_SAFE_INTEGER && rightIdx > leftIdx) {
        streamGaps.push(rightIdx - leftIdx)
      }
    }
  }

  const twoColLines = streamGaps.length
  if (twoColLines < 6) {
    return { twoColScore, interleaved: null }
  }
  streamGaps.sort((a, b) => a - b)
  const median = streamGaps[Math.floor(streamGaps.length / 2)]
  return { twoColScore, interleaved: median > 10 }
}

export function twoColNote(meta: ResumeSourceMeta, pct: number): { level: 'pass' | 'warn' | 'fail'; label: string } {
  if (meta.interleaved) {
    return {
      level: 'fail',
      label:
        `Two-column layout with scrambled text order detected (${pct}% of lines start mid-page). ` +
        'Text may be read column-by-column and garbled by the ATS — use a single-column template.',
    }
  }
  if (pct > 10) {
    return {
      level: 'warn',
      label: `Possible two-column layout (${pct}% of lines start mid-page). Convert to single column — Workday/Taleo parse two-column at ~47-64% accuracy.`,
    }
  }
  return { level: 'pass', label: 'Single-column layout (PDF text position analysis).' }
}