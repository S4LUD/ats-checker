import { useState } from 'react'
import { Download } from 'lucide-react'
import type { Check, KeywordAnalysis, KeywordInfo, PresetResults, ScoreDeltas } from '../lib/types'
import { buildReportMd, downloadReport } from '../lib/report'
import { AiTips } from './AiTips'
import { ScoreRing } from './ScoreRing'
import { CompareTable } from './CompareTable'
import { CheckList } from './CheckList'
import { Chips, KeywordChips } from './Chips'

interface CategoryBarProps {
  label: string
  value: number
  color: string
}

function CategoryBar({ label, value, color }: CategoryBarProps) {
  return (
    <div className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 text-[13px]">
      <span className="text-muted truncate">{label}</span>
      <div className="h-1.5 rounded-full bg-panel2 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-right text-muted tabular-nums">{value}</span>
    </div>
  )
}

interface ResultsCardProps {
  breakdown: PresetResults
  note: string
  presetName: string
  tips: string[]
  keywords: KeywordInfo[] | null
  kwRes: KeywordAnalysis | null
  detectedSkills: KeywordInfo[] | null
  fmtChecks: Check[]
  bulletChecks: Check[]
  contactChecks: Check[]
  miscChecks: Check[]
  deltas: ScoreDeltas
  compareResults: PresetResults[] | null
  localeName: string
  sourceName: string
  resumeText: string
  jdText: string
}

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`mt-6 pt-5 border-t border-edge ${className}`}>{children}</section>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-semibold tracking-tight mb-2.5">{children}</h3>
}

export function ResultsCard({
  breakdown,
  note,
  presetName,
  tips,
  keywords,
  kwRes,
  detectedSkills,
  fmtChecks,
  bulletChecks,
  contactChecks,
  miscChecks,
  deltas,
  compareResults,
  localeName,
  sourceName,
  resumeText,
  jdText,
}: ResultsCardProps) {
  const [saved, setSaved] = useState(false)

  const download = () => {
    downloadReport(
      buildReportMd({
        presetName,
        breakdown,
        deltas,
        keywords,
        kwRes,
        fmtChecks,
        bulletChecks,
        contactChecks,
        miscChecks,
        localeName,
        sourceName,
        generatedAt: new Date().toLocaleString(),
      }),
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const totalGain = deltas.deltas.reduce((sum, d) => sum + d.gain, 0)

  return (
    <div className="bg-panel border border-edge rounded-lg p-5 animate-fade-in">
      {compareResults && compareResults.length > 0 && (
        <Section className="mt-0 pt-0 border-t-0">
          <SectionTitle>Score across ATS systems</SectionTitle>
          <CompareTable results={compareResults} />
          <p className="text-[11px] text-muted mt-2">
            All presets run on the same resume and job description. Check the tips for the best match to your target employer.
          </p>
        </Section>
      )}

      <Section className="mt-0 pt-0 border-t-0">
        <ScoreRing score={breakdown.total} grade={breakdown.grade} note={note} />

        <div className="grid gap-1.5 mt-4 max-w-xl">
          <CategoryBar label="Keyword match" value={breakdown.kwScore} color="#0ea5e9" />
          <CategoryBar label="Format & structure" value={breakdown.fmtScore} color="#16a34a" />
          <CategoryBar label="Bullet quality" value={breakdown.bulletScore} color="#d97706" />
          <CategoryBar label="Contact info" value={breakdown.contactScore} color="#dc2626" />
          <CategoryBar label="Work auth & extras" value={breakdown.miscScore} color="#7c3aed" />
        </div>
      </Section>

      {deltas.deltas.length > 0 && (
        <Section>
          <SectionTitle>Potential after fixing flagged items</SectionTitle>
          <p className="text-[12px] text-muted mb-2">
            Fix everything below and this preset estimates ~{deltas.perfectTotal}/100.
          </p>
          <ul className="space-y-1 max-w-xl">
            {deltas.deltas.map((d) => (
              <li key={d.category} className="text-[13px] flex justify-between gap-4">
                <span className="text-body/90">{d.label}</span>
                <span className="text-good tabular-nums">+{d.gain}</span>
              </li>
            ))}
          </ul>
          {totalGain > 0 && <p className="text-[13px] font-medium mt-2 text-good">Total potential: +{totalGain}</p>}
        </Section>
      )}

      <div className="grid lg:grid-cols-2 gap-x-8 gap-y-6 mt-6 pt-5 border-t border-edge">
        <section>
          <SectionTitle>Keyword match</SectionTitle>
          {keywords && kwRes ? (
            <>
              <p className="text-[12px] text-muted mb-2.5">
                {kwRes.total} keywords extracted from the job description. {kwRes.matched.length + kwRes.low.length} found on your
                resume, {kwRes.missing.length} missing.
              </p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[12px] font-medium mb-1 text-bad">Missing from resume</p>
                  <Chips items={kwRes.missing} tone="missing" />
                </div>
                {kwRes.low.length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium mb-1 text-caution">Present but under-used</p>
                    <KeywordChips items={kwRes.low} />
                  </div>
                )}
                <div>
                  <p className="text-[12px] font-medium mb-1 text-good">Matched</p>
                  <KeywordChips items={kwRes.matched} />
                </div>
                {kwRes.irrelevant.length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium mb-1 text-muted">On your resume but not in the job — consider trimming</p>
                    <Chips items={kwRes.irrelevant} tone="neutral" />
                  </div>
                )}
              </div>
            </>
          ) : detectedSkills && detectedSkills.length > 0 ? (
            <div>
              <p className="text-[12px] text-muted mb-2.5">
                No job description yet — {detectedSkills.length} skills detected in your resume. Paste a JD to see matched vs
                missing keywords.
              </p>
              <p className="text-[12px] font-medium mb-1 text-good">Detected in resume</p>
              <KeywordChips items={detectedSkills} />
            </div>
          ) : (
            <p className="text-[13px] text-muted">Paste a job description to compute keyword matching.</p>
          )}
        </section>

        <section>
          <SectionTitle>Formatting &amp; structure</SectionTitle>
          <CheckList checks={fmtChecks} />
        </section>
      </div>

      <Section>
        <SectionTitle>Bullets, contact &amp; extras</SectionTitle>
        <div className="grid lg:grid-cols-2 gap-x-8 gap-y-5">
          <CheckList checks={bulletChecks} />
          <div className="space-y-5">
            <CheckList checks={contactChecks} />
            {miscChecks.length > 0 && <CheckList checks={miscChecks} />}
          </div>
        </div>
      </Section>

      <Section>
        <SectionTitle>Tips for {presetName}</SectionTitle>
        <ul className="space-y-1.5">
          {tips.map((t) => (
            <li key={t} className="text-[13px] text-body/90 list-disc list-inside">
              {t}
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap items-start gap-x-5 gap-y-2 mt-6 pt-4 border-t border-edge">
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-1.5 h-7 px-1 -ml-1 rounded-md text-[13px] text-muted hover:text-body transition-colors cursor-pointer"
        >
          <Download className="size-3.5" aria-hidden="true" />
          {saved ? 'Report downloaded' : 'Download report (.md)'}
        </button>
        <AiTips
          resumeText={resumeText}
          jdText={jdText}
          score={breakdown.total}
          grade={breakdown.grade}
          missing={kwRes?.missing ?? []}
          listOnly={kwRes?.listOnly ?? []}
          fmtFails={fmtChecks.filter((c) => c.level !== 'pass').map((c) => c.label)}
          miscFails={miscChecks.filter((c) => c.level !== 'pass').map((c) => c.label)}
        />
      </div>
    </div>
  )
}