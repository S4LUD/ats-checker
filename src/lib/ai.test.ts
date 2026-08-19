import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAiEndpoint, getAiModel, requestAiTips } from './ai'

const ENDPOINT = 'http://ollama.local/api/chat'
const MODEL = 'test-model'

beforeEach(() => {
  vi.stubEnv('OLLAMA_AI_ENDPOINT', ENDPOINT)
  vi.stubEnv('OLLAMA_AI_MODEL', MODEL)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function stubFetch(payload: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => (ok ? payload : { error: { message: `HTTP ${status}` } }),
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('config', () => {
  it('reads the endpoint and model from env', () => {
    expect(getAiEndpoint()).toBe(ENDPOINT)
    expect(getAiModel()).toBe(MODEL)
  })
})

describe('requestAiTips', () => {
  const resume = 'Resume text'
  const jd = 'Job text'
  const ctx = { score: 64, grade: 'Needs work', missing: ['kubernetes'], listOnly: [], fmtFails: ['Missing Skills'], miscFails: [] }

  it('returns the model prose as tips', async () => {
    await stubFetch({ message: { content: '**Keywords first.** Add Kubernetes to a bullet under Experience.' }, done_reason: 'stop' })
    const tips = await requestAiTips(resume, jd, ctx)
    expect(tips).toBe('**Keywords first.** Add Kubernetes to a bullet under Experience.')
  })

  it('posts to the configured endpoint with thinking disabled', async () => {
    const fn = await stubFetch({ message: { content: '[]' }, done_reason: 'stop' })
    await requestAiTips(resume, jd, ctx)
    const [url, init] = fn.mock.calls[0]
    expect(url).toBe(ENDPOINT)
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe(MODEL)
    expect(body.think).toBe(false)
    expect(body.stream).toBe(false)
    expect(init.headers).not.toHaveProperty('Authorization')
  })

  it('strips markdown code fences from the response', async () => {
    await stubFetch({ message: { content: '```markdown\n**Formatting.** Keep it to one column.\n```' }, done_reason: 'stop' })
    const tips = await requestAiTips(resume, jd, ctx)
    expect(tips).toBe('**Formatting.** Keep it to one column.')
  })

  it('rejects on 401 with a clear message', async () => {
    await stubFetch(null, false, 401)
    await expect(requestAiTips(resume, jd, ctx)).rejects.toThrow('401')
  })

  it('rejects when the response is empty', async () => {
    await stubFetch({ message: { content: '' }, done_reason: 'stop' })
    await expect(requestAiTips(resume, jd, ctx)).rejects.toThrow('Empty response')
  })

  it('rejects when the response was cut off', async () => {
    await stubFetch({ message: { content: 'short' }, done_reason: 'length' })
    await expect(requestAiTips(resume, jd, ctx)).rejects.toThrow('cut off')
  })

  it('rejects without a resume', async () => {
    await expect(requestAiTips('', jd, ctx)).rejects.toThrow('resume')
  })

  it('shows a generic message when the endpoint env is missing', async () => {
    vi.stubEnv('OLLAMA_AI_ENDPOINT', '')
    await expect(requestAiTips(resume, jd, ctx)).rejects.toThrow('temporarily unavailable')
  })
})
