import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAiSettings, loadAiSettings, requestAiTips, saveAiSettings, AI_DEFAULTS } from './ai'
import type { AiSettings } from './ai'

const SETTINGS: AiSettings = { apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' }

let store = new Map<string, string>()

beforeEach(() => {
  store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('settings storage', () => {
  it('round-trips settings through localStorage', () => {
    saveAiSettings(SETTINGS)
    expect(loadAiSettings()).toEqual(SETTINGS)
  })

  it('returns defaults on corrupt or missing storage', () => {
    store.set('ats-ai-settings', '{not json')
    expect(loadAiSettings()).toEqual(AI_DEFAULTS)
    clearAiSettings()
    expect(loadAiSettings()).toEqual(AI_DEFAULTS)
  })
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

describe('requestAiTips', () => {
  const resume = 'Resume text'
  const jd = 'Job text'
  const ctx = { score: 64, grade: 'Needs work', missing: ['kubernetes'], listOnly: [], fmtFails: ['Missing Skills'], miscFails: [] }

  it('returns the model prose as tips', async () => {
    await stubFetch({ choices: [{ message: { content: '**Keywords first.** Add Kubernetes to a bullet under Experience.' } }] })
    const tips = await requestAiTips(SETTINGS, resume, jd, ctx)
    expect(tips).toBe('**Keywords first.** Add Kubernetes to a bullet under Experience.')
  })

  it('strips markdown code fences from the response', async () => {
    await stubFetch({
      choices: [{ message: { content: '```markdown\n**Formatting.** Keep it to one column.\n```' } }],
    })
    const tips = await requestAiTips(SETTINGS, resume, jd, ctx)
    expect(tips).toBe('**Formatting.** Keep it to one column.')
  })

  it('rejects on 401 with a clear message', async () => {
    await stubFetch(null, false, 401)
    await expect(requestAiTips(SETTINGS, resume, jd, ctx)).rejects.toThrow('401')
  })

  it('rejects when no API key is set for a remote endpoint', async () => {
    await expect(requestAiTips({ ...SETTINGS, apiKey: '' }, resume, jd, ctx)).rejects.toThrow('API key')
  })

  it('allows a missing API key for a local Ollama endpoint', async () => {
    const fn = await stubFetch({ choices: [{ message: { content: '[]' } }] })
    const settings = { ...SETTINGS, apiKey: '', baseUrl: 'http://localhost:11434/v1/chat/completions' }
    await requestAiTips(settings, resume, jd, ctx)
    const init = fn.mock.calls[0][1] as RequestInit
    expect(init.headers).not.toHaveProperty('Authorization')
  })
})