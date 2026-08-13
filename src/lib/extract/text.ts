export function wordCount(text: string): number {
  const m = text.trim().match(/\S+/g)
  return m ? m.length : 0
}

/** Group text items sharing a baseline (y) into lines, preserving reading order */
export function itemsToLines(items: Array<{ str: string; y: number }>): string {
  const lines: string[] = []
  let current: string[] = []
  let lastY: number | null = null
  for (const it of items) {
    if (lastY !== null && Math.abs(it.y - lastY) > 1) {
      lines.push(current.join(' '))
      current = []
    }
    current.push(it.str)
    lastY = it.y
  }
  if (current.length) lines.push(current.join(' '))
  return lines.join('\n')
}