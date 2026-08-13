import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import * as mammoth from 'mammoth'
import type { ResumeSourceMeta } from '../types'
import { detectColumnOrder } from '../analysis/column-order'
import { itemsToLines, wordCount } from './text'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export class FileExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileExtractionError'
  }
}

const SPARSE_WORD_THRESHOLD = 25

/** render every page to a canvas and OCR it with tesseract.js (lazy import) */
async function ocrPdf(pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>, name: string): Promise<{ text: string; meta: ResumeSourceMeta }> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  const textLines: string[] = []
  try {
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      const { data } = await worker.recognize(canvas)
      textLines.push(data.text)
    }
  } finally {
    await worker.terminate()
  }
  const text = textLines.join('\n')
  return {
    text,
    meta: {
      kind: 'pdf',
      name,
      words: wordCount(text),
      tableCount: null,
      imgCount: null,
      pageCount: pdf.numPages,
      twoColScore: null,
      interleaved: null,
      ocrFallback: true,
    },
  }
}

async function extractPdf(buffer: ArrayBuffer, name: string): Promise<{ text: string; meta: ResumeSourceMeta }> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const textLines: string[] = []
  let allStarts = 0
  let rightStarts = 0
  let interleaved = false

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const items: Array<{ str: string; x: number; y: number }> = []
    const lineMinX = new Map<number, number>()

    for (const item of content.items) {
      if (!('str' in item) || !item.str || !item.str.trim()) continue
      const y = Math.round(item.transform[5] * 2) / 2
      const x = item.transform[4]
      const current = lineMinX.get(y)
      if (current === undefined || x < current) lineMinX.set(y, x)
      items.push({ str: item.str, x, y })
    }

    const width = viewport.width || 612
    const starts = Array.from(lineMinX.values())
    allStarts += starts.length
    for (const x of starts) {
      if (x >= width * 0.38 && x < width * 0.8) rightStarts++
    }

    const col = detectColumnOrder(items, width)
    if (col.interleaved) interleaved = true
    let stream = items
    if (col.interleaved) {
      stream = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
    }
    textLines.push(...itemsToLines(stream).split('\n'))
  }

  const text = textLines.join('\n')
  if (wordCount(text) < SPARSE_WORD_THRESHOLD) {
    try {
      return await ocrPdf(pdf, name)
    } catch {
      // OCR unavailable or failed — keep the sparse text so the user still gets a result
    }
  }
  const twoColScore = allStarts > 0 ? rightStarts / allStarts : 0
  return {
    text,
    meta: {
      kind: 'pdf',
      name,
      words: wordCount(text),
      tableCount: null,
      imgCount: null,
      pageCount: pdf.numPages,
      twoColScore,
      interleaved,
    },
  }
}

async function extractDocx(buffer: ArrayBuffer, name: string): Promise<{ text: string; meta: ResumeSourceMeta }> {
  const html = await mammoth.convertToHtml({ arrayBuffer: buffer })
  const container = document.createElement('div')
  container.innerHTML = html.value
  const tableCount = container.querySelectorAll('table').length
  const imgCount = container.querySelectorAll('img').length
  const text = container.textContent ?? ''
  return {
    text,
    meta: {
      kind: 'docx',
      name,
      words: wordCount(text),
      tableCount,
      imgCount,
      pageCount: null,
      twoColScore: null,
      interleaved: null,
    },
  }
}

async function extractTxt(buffer: ArrayBuffer, name: string): Promise<{ text: string; meta: ResumeSourceMeta }> {
  const text = new TextDecoder('utf-8').decode(buffer)
  return {
    text,
    meta: {
      kind: 'txt',
      name,
      words: wordCount(text),
      tableCount: null,
      imgCount: null,
      pageCount: null,
      twoColScore: null,
      interleaved: null,
    },
  }
}

export async function extractFromFile(file: File): Promise<{ text: string; meta: ResumeSourceMeta }> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  const mime = file.type.toLowerCase()
  const buffer = await file.arrayBuffer().catch(() => {
    throw new FileExtractionError('Could not read that file.')
  })

  if (ext === 'pdf' || mime === 'application/pdf') {
    try {
      return await extractPdf(buffer, file.name)
    } catch {
      throw new FileExtractionError('Failed to parse PDF. The file may be corrupted, scanned, or password-protected.')
    }
  }
  if (ext === 'docx' || mime.includes('wordprocessingml')) {
    try {
      return await extractDocx(buffer, file.name)
    } catch {
      throw new FileExtractionError('Failed to parse DOCX. The file may be corrupted or password-protected.')
    }
  }
  if (ext === 'txt' || mime === 'text/plain') {
    return extractTxt(buffer, file.name)
  }
  throw new FileExtractionError('Unsupported file type. Use .pdf, .docx or .txt. (Legacy .doc is not supported.)')
}
