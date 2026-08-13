export interface AiSettings {
  apiKey: string
  baseUrl: string
  model: string
}

export const AI_STORAGE_KEY = 'ats-ai-settings'
export const AI_DEFAULTS: AiSettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY)
    if (!raw) return { ...AI_DEFAULTS }
    return { ...AI_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...AI_DEFAULTS }
  }
}

export function saveAiSettings(settings: AiSettings): void {
  localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(settings))
}

export function clearAiSettings(): void {
  localStorage.removeItem(AI_STORAGE_KEY)
}

function summaryForPrompt(score: number, grade: string, missing: string[], listOnly: string[], fmtFails: string[], miscFails: string[]): string {
  return [
    `Current score: ${score}/100 (${grade}).`,
    missing.length > 0 ? `Missing keywords: ${missing.join(', ')}.` : 'All JD keywords matched.',
    listOnly.length > 0 ? `Listed-only skills (never used in bullets): ${listOnly.join(', ')}.` : '',
    fmtFails.length > 0 ? `Format issues: ${fmtFails.join('; ')}.` : '',
    miscFails.length > 0 ? `Other issues: ${miscFails.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Ask an OpenAI-compatible chat endpoint (user's own key, client-side only)
 * for general resume improvement tips, returned as markdown prose.
 */
export async function requestAiTips(
  settings: AiSettings,
  resumeText: string,
  jdText: string,
  context: { score: number; grade: string; missing: string[]; listOnly: string[]; fmtFails: string[]; miscFails: string[] },
): Promise<string> {
  const localOllama = /(localhost|127\.0\.0\.1):11434/.test(settings.baseUrl)
  if (!settings.apiKey.trim() && !localOllama) throw new Error('Add an API key first — it stays in your browser only.')
  if (!settings.baseUrl.trim()) throw new Error('Base URL is missing.')
  if (!resumeText.trim()) throw new Error('Paste or upload a resume first.')

  const system =
    'You are a senior technical recruiter and resume writer. The user is applying through an ATS. ' +
    'Write concise, general improvement tips for their resume as plain markdown prose. ' +
    'Lead with the single highest-impact fix, then cover keyword matching, formatting and structure, bullet quality, and ' +
    'contact or extras as relevant. Use short paragraphs separated by blank lines and **bold** for brief lead-ins. ' +
    'Do NOT use numbered lists, bullet points, headings, or JSON — prose only.'

  const user = [
    `JOB DESCRIPTION:\n${jdText.trim() || '(none provided)'}`,
    `\nRESUME:\n${resumeText.trim()}`,
    `\nANALYZER SUMMARY: ${summaryForPrompt(context.score, context.grade, context.missing, context.listOnly, context.fmtFails, context.miscFails)}`,
    '\nWrite the improvement tips now.',
  ].join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (settings.apiKey.trim()) headers.Authorization = `Bearer ${settings.apiKey.trim()}`
  const res = await fetch(settings.baseUrl.trim(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
        model: settings.model.trim() || AI_DEFAULTS.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('The API key was rejected (401/403). Check it and try again.')
      if (res.status === 429) throw new Error('Rate limited (429). Wait a minute and retry.')
      throw new Error(`The AI endpoint returned HTTP ${res.status}.`)
    }
    const data = await res.json()
    const content: string = data?.choices?.[0]?.message?.content ?? ''
    if (!content) throw new Error('Empty response from the AI endpoint.')
    if (data?.choices?.[0]?.finish_reason === 'length') {
      throw new Error('The model response was cut off (token limit reached). Try again.')
    }
    return content
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Timed out after 60s — the model may be overloaded.')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}