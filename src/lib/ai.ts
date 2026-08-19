export function getAiEndpoint(): string {
  return import.meta.env.OLLAMA_AI_ENDPOINT ?? ''
}

export function getAiModel(): string {
  return import.meta.env.OLLAMA_AI_MODEL ?? ''
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
 * Ask the user's Ollama server (OpenAI-compatible /api/chat) for general
 * resume improvement tips, returned as markdown prose. Everything is
 * client-side; the resume and job text go to AI_ENDPOINT.
 */
export async function requestAiTips(
  resumeText: string,
  jdText: string,
  context: { score: number; grade: string; missing: string[]; listOnly: string[]; fmtFails: string[]; miscFails: string[] },
): Promise<string> {
  if (!resumeText.trim()) throw new Error('Paste or upload a resume first.')
  const endpoint = getAiEndpoint()
  const model = getAiModel()
  if (!endpoint || !model) {
    console.warn('[ai] AI tips requested but the AI service is not configured.')
    throw new Error('AI tips are temporarily unavailable. Please try again later.')
  }

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
  const timeout = setTimeout(() => controller.abort(), 120_000)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: false,
        think: false,
        options: { temperature: 0.4, num_predict: 4096 },
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('The AI server rejected the request (401/403).')
      if (res.status === 429) throw new Error('The AI server is busy (429). Wait a minute and retry.')
      throw new Error(`The AI endpoint returned HTTP ${res.status}.`)
    }
    const data = await res.json()
    const content: string = data?.message?.content ?? ''
    if (!content) throw new Error('Empty response from the AI server.')
    if (data?.done_reason === 'length') {
      throw new Error('The model response was cut off (token limit reached). Try again.')
    }
    return content
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Timed out after 120s — the model may be overloaded.')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
