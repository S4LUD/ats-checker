import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AI_DEFAULTS, clearAiSettings, loadAiSettings, requestAiTips, saveAiSettings } from '../lib/ai'

interface AiTipsProps {
  resumeText: string
  jdText: string
  score: number
  grade: string
  missing: string[]
  listOnly: string[]
  fmtFails: string[]
  miscFails: string[]
}

const INPUT_CLASSES =
  'mt-0.5 w-full h-8 bg-panel text-body border border-edge rounded-md px-2.5 text-[13px] placeholder:text-muted/60 transition-colors focus:outline-none focus:border-accent'

function renderParagraph(text: string) {
  return text.split('**').map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}

export function AiTips({ resumeText, jdText, score, grade, missing, listOnly, fmtFails, miscFails }: AiTipsProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tips, setTips] = useState<string | null>(null)
  const [settings, setSettings] = useState(() => loadAiSettings())

  const ask = async () => {
    setSaving(true)
    setError(null)
    setTips(null)
    try {
      const result = await requestAiTips(settings, resumeText, jdText, { score, grade, missing, listOnly, fmtFails, miscFails })
      setTips(result)
      saveAiSettings(settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI tips.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-7 px-1 rounded-md text-[13px] text-muted hover:text-body transition-colors cursor-pointer"
      >
        <Sparkles className="size-3.5" aria-hidden="true" />
        {open ? 'Hide AI tips' : 'Get AI improvement tips'}
      </button>
      {open && (
        <div className="mt-2 bg-panel2/60 border border-edge rounded-md p-3 space-y-3 max-w-2xl">
          <p className="text-[11px] text-muted leading-relaxed">
            Optional: add an OpenAI-compatible API key, or leave it blank for a local Ollama server (e.g.
            http://localhost:11434/v1/chat/completions). Requests go directly from this tab to the endpoint you enter; the key is
            stored only in your browser's localStorage.
          </p>
          <label className="block text-[12px] text-muted">
            API key
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
              placeholder="sk-…"
              className={INPUT_CLASSES}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] text-muted">
              Endpoint
              <input
                value={settings.baseUrl}
                onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
                className={INPUT_CLASSES}
              />
            </label>
            <label className="block text-[12px] text-muted">
              Model
              <input
                value={settings.model}
                onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                className={INPUT_CLASSES}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={ask}
              disabled={saving}
              className="inline-flex items-center h-8 px-3 rounded-md bg-accent text-white text-[13px] font-medium transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Asking…' : tips ? 'Ask again' : 'Generate improvement tips'}
            </button>
            <button
              type="button"
              onClick={() => {
                clearAiSettings()
                setSettings({ ...AI_DEFAULTS })
              }}
              className="text-[11px] text-muted hover:text-body transition-colors cursor-pointer"
            >
              Clear saved key
            </button>
          </div>
          {error && <p className="text-[12px] text-bad">{error}</p>}
          {tips && typeof tips === 'string' && (
            <div className="border-t border-edge pt-3 space-y-2.5">
              {tips
                .split(/\n{2,}/)
                .map((p) => p.replace(/\n/g, ' ').trim())
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-body/90">
                    {renderParagraph(p)}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}