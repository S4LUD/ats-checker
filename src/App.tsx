import { useEffect, useMemo, useRef, useState } from 'react'
import { FileCheck2, Lock, Moon, Sun, Zap } from 'lucide-react'
import { ATS_PRESETS, PRESET_IDS } from './lib/ats/presets'
import { LOCALES, LOCALE_IDS } from './lib/ats/locales'
import { extractKeywords, keywordAnalysis, detectResumeSkills } from './lib/analysis/keywords'
import { checkFormatting } from './lib/analysis/format'
import { checkBullets } from './lib/analysis/bullets'
import { checkContact } from './lib/analysis/contact'
import { checkMisc } from './lib/analysis/misc'
import { computeScores, computeScoreDeltas, compareAcrossPresets } from './lib/analysis/scoring'
import { parseResume } from './lib/parse/resume-parser'
import { SAMPLE_JD, SAMPLE_RESUMES } from './lib/extract/samples'
import type { LocaleId, PresetId, ResumeSourceMeta } from './lib/types'
import { JdPanel, ResumePanel } from './components/InputPanel'
import { ResultsCard } from './components/ResultsCard'

const PASTED_SOURCE: ResumeSourceMeta = {
  kind: 'text',
  name: 'pasted text',
  words: 0,
  tableCount: null,
  imgCount: null,
  pageCount: null,
  twoColScore: null,
  interleaved: null,
}

function App() {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('ats-theme', dark ? 'dark' : 'light')
    } catch {
      /* storage unavailable — ignore */
    }
  }, [dark])
  const [resumeText, setResumeText] = useState('')
  const [source, setSource] = useState<ResumeSourceMeta | null>(null)
  const [jdText, setJdText] = useState('')
  const [presetId, setPresetId] = useState<PresetId>('auto')
  const [localeId, setLocaleId] = useState<LocaleId>('global')
  const [compareAll, setCompareAll] = useState(true)
  const [deepMatch, setDeepMatch] = useState(true)
  const [semanticHits, setSemanticHits] = useState<string[]>([])
  const [semanticBusy, setSemanticBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const resumeAreaRef = useRef<HTMLTextAreaElement>(null)

  const preset = ATS_PRESETS[presetId]
  const locale = LOCALES[localeId]
  const keywords = useMemo(() => (jdText.trim() ? extractKeywords(jdText) : null), [jdText])

  const analysis = useMemo(() => {
    if (!resumeText.trim()) return null
    const src = source ?? PASTED_SOURCE
    const base = { preset, resumeText, source: src, jdText, keywords, locale }
    const kwRes = keywords ? keywordAnalysis(resumeText.toLowerCase(), keywords, preset, { semanticHits }) : null
    const detectedSkills = keywords ? null : detectResumeSkills(resumeText)
    const fmtChecks = checkFormatting(resumeText, src, locale)
    const bulletChecks = checkBullets(resumeText)
    const contactChecks = checkContact(resumeText)
    const miscChecks = checkMisc(resumeText, jdText, locale)
    const breakdown = computeScores({ ...base, kwRes })
    const deltas = computeScoreDeltas({ ...base, kwRes })
    const compareResults = compareAll
      ? compareAcrossPresets({ ...base, presets: PRESET_IDS.map((id) => ATS_PRESETS[id]) })
      : null
    return { kwRes, detectedSkills, fmtChecks, bulletChecks, contactChecks, miscChecks, breakdown, deltas, compareResults }
  }, [resumeText, source, keywords, preset, locale, compareAll, jdText, semanticHits])

  const parsed = useMemo(() => (resumeText.trim() ? parseResume(resumeText) : null), [resumeText])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    if (!deepMatch || !keywords || resumeText.trim().length < 40) {
      setSemanticHits([])
      setSemanticBusy(false)
      return
    }
    timer = setTimeout(async () => {
      const lexical = keywordAnalysis(resumeText.toLowerCase(), keywords, preset)
      const terms = lexical.missing.slice(0, 25)
      if (terms.length === 0) {
        if (!cancelled) {
          setSemanticHits([])
          setSemanticBusy(false)
        }
        return
      }
      if (!cancelled) setSemanticBusy(true)
      try {
        const { semanticMatch } = await import('./lib/analysis/semantic')
        const hits = await semanticMatch(resumeText, terms)
        if (!cancelled) setSemanticHits(hits.map((h) => h.term))
      } catch {
        if (!cancelled) setSemanticHits([])
      } finally {
        if (!cancelled) setSemanticBusy(false)
      }
    }, 500)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [deepMatch, keywords, preset, resumeText])

  const handleFile = async (file: File) => {
    setBusy(true)
    setFileError(null)
    try {
      const { extractFromFile } = await import('./lib/extract/resume-source')
      const res = await extractFromFile(file)
      setSource(res.meta)
      setResumeText(res.text)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to read the file.')
    } finally {
      setBusy(false)
    }
  }

  const useSampleResume = (sample: typeof SAMPLE_RESUMES[number]) => {
    setSource(sample.meta)
    setResumeText(sample.text)
    setFileError(null)
  }

  const run = () => {
    if (!resumeText.trim()) {
      resumeAreaRef.current?.focus()
      return
    }
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const total = analysis?.breakdown.total ?? 0
  const note =
    total >= 85
      ? 'Strong chance of parsing cleanly and matching keywords.'
      : total >= 70
        ? 'Solid, but the flagged items below will boost your odds.'
        : total >= 50
          ? 'Address the missing keywords and format warnings before applying.'
          : 'This resume is likely to be filtered or poorly parsed. Fix format issues first, then keywords.'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-bg border-b border-edge">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-2.5">
          <span className="size-7 rounded-md border border-edge flex items-center justify-center text-accent">
            <FileCheck2 className="size-4" strokeWidth={2} aria-hidden="true" />
          </span>
          <h1 className="text-[13px] font-semibold tracking-tight">ATS Resume Checker</h1>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted">
            <Lock className="size-3" aria-hidden="true" />
            100% local
          </span>
          <button
            type="button"
            onClick={() => setDark((v) => !v)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="size-7 inline-flex items-center justify-center rounded-md text-muted transition-colors hover:text-body hover:bg-panel2 cursor-pointer"
          >
            {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <section className="mb-5">
          <h2 className="text-base font-semibold tracking-tight">Will your resume survive the ATS?</h2>
          <p className="text-[13px] text-muted mt-0.5">
            Simulates how applicant tracking systems parse and score your resume — keyword matching, formatting, bullets, and contact
            info. Everything runs locally.
          </p>
        </section>

        <div className="grid lg:grid-cols-2 gap-4">
          <ResumePanel
            text={resumeText}
            onTextChange={(v) => {
              setResumeText(v)
              if (!source) setSource(PASTED_SOURCE)
            }}
            onFile={handleFile}
            samples={SAMPLE_RESUMES}
            onSample={useSampleResume}
            busy={busy}
            busyLabel="Extracting text from file..."
            source={source}
            error={fileError}
            textareaRef={resumeAreaRef}
          />
          <JdPanel text={jdText} onChange={setJdText} onUseSample={() => setJdText(SAMPLE_JD)} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white text-[13px] font-medium transition-colors hover:opacity-90 cursor-pointer"
          >
            <Zap className="size-3.5" aria-hidden="true" />
            Run ATS check
          </button>
          <label className="flex items-center gap-1.5 text-[13px] text-muted cursor-pointer select-none hover:text-body transition-colors">
            <input
              type="checkbox"
              checked={compareAll}
              onChange={(e) => setCompareAll(e.target.checked)}
              className="accent-accent size-3.5"
            />
            Compare all ATS systems
          </label>
          <label
            className={`flex items-center gap-1.5 text-[13px] cursor-pointer select-none transition-colors ${
              deepMatch ? 'text-body' : 'text-muted hover:text-body'
            }`}
            title="Runs a small semantic model locally to catch JD terms phrased differently in your resume, plus stem/negation matching"
          >
            <input
              type="checkbox"
              checked={deepMatch}
              onChange={(e) => setDeepMatch(e.target.checked)}
              className="accent-accent size-3.5"
            />
            Deep match
            {semanticBusy && (
              <span className="size-3 rounded-full border-[1.5px] border-accent/30 border-t-accent animate-spin" />
            )}
          </label>
          <span className="flex items-center gap-1.5">
            <label htmlFor="ats-preset" className="text-[13px] text-muted">
              Simulate:
            </label>
            <select
              id="ats-preset"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value as PresetId)}
              className="h-8 bg-panel text-body border border-edge rounded-md px-2.5 pr-6 text-[13px] transition-colors hover:border-edge focus:border-accent cursor-pointer"
            >
              {PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {ATS_PRESETS[id].name}
                </option>
              ))}
            </select>
          </span>
          <span className="flex items-center gap-1.5">
            <label htmlFor="locale" className="text-[13px] text-muted">
              Locale:
            </label>
            <select
              id="locale"
              value={localeId}
              onChange={(e) => setLocaleId(e.target.value as LocaleId)}
              className="h-8 bg-panel text-body border border-edge rounded-md px-2.5 pr-6 text-[13px] transition-colors hover:border-edge focus:border-accent cursor-pointer"
            >
              {LOCALE_IDS.map((id) => (
                <option key={id} value={id}>
                  {LOCALES[id].name}
                </option>
              ))}
            </select>
          </span>
        </div>

        {analysis && (
          <div ref={resultsRef} className="mt-5 scroll-mt-14 animate-fade-in">
            <ResultsCard
              breakdown={analysis.breakdown}
              note={`${note}  Simulated: ${preset.name}.`}
              presetName={preset.name}
              tips={preset.tips}
              keywords={keywords}
              kwRes={analysis.kwRes}
              detectedSkills={analysis.detectedSkills}
              fmtChecks={analysis.fmtChecks}
              bulletChecks={analysis.bulletChecks}
              contactChecks={analysis.contactChecks}
              miscChecks={analysis.miscChecks}
              deltas={analysis.deltas}
              compareResults={analysis.compareResults}
              localeName={locale.name}
              sourceName={(source ?? PASTED_SOURCE).name}
              resumeText={resumeText}
              jdText={jdText}
              parsed={parsed}
              deepMatch={deepMatch}
              semanticBusy={semanticBusy}
              semanticHits={semanticHits}
            />
          </div>
        )}

        <footer className="mt-10 pt-4 border-t border-edge text-[11px] text-muted pb-2">
          Heuristic simulator, not affiliated with any ATS vendor. Scores are estimates — no tool can exactly replicate a company's
          parsing and recruiter search behavior.
        </footer>
      </main>
    </div>
  )
}

export default App