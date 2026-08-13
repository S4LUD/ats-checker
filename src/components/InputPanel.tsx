import { useRef, useState } from 'react'
import { BookOpen, ChevronDown, UploadCloud, X } from 'lucide-react'
import type { ResumeSourceMeta } from '../lib/types'
import type { SampleResume } from '../lib/extract/samples'
import { wordCount } from '../lib/extract/text'

interface PanelProps {
  title: string
  helper: string
  children: React.ReactNode
}

function Panel({ title, helper, children }: PanelProps) {
  return (
    <section className="bg-panel border border-edge rounded-lg p-4">
      <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
      <p className="text-[11px] text-muted mt-0.5 mb-3 leading-relaxed">{helper}</p>
      {children}
    </section>
  )
}

const TEXTAREA_CLASSES =
  'w-full min-h-44 bg-panel2/60 text-body border border-edge rounded-md p-2.5 text-sm font-sans resize-y placeholder:text-muted/60 transition-colors focus:outline-none focus:border-accent focus:bg-panel'

function Toolbar({ text, onClear, meta }: { text: string; onClear: () => void; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 mt-1.5">
      <span className="text-[11px] text-muted tabular-nums truncate">
        {meta ? `${meta} · ` : ''}
        {wordCount(text)} words · {text.length.toLocaleString()} chars
      </span>
      {text && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-body transition-colors cursor-pointer shrink-0"
        >
          <X className="size-3.5" aria-hidden="true" />
          Clear
        </button>
      )}
    </div>
  )
}

interface ResumePanelProps {
  text: string
  onTextChange: (value: string) => void
  onFile: (file: File) => void
  samples: SampleResume[]
  onSample: (sample: SampleResume) => void
  busy: boolean
  busyLabel: string
  source: ResumeSourceMeta | null
  error: string | null
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function ResumePanel({ text, onTextChange, onFile, samples, onSample, busy, busyLabel, source, error, textareaRef }: ResumePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const status =
    source && !busy
      ? `Loaded ${source.name} — ${source.words} words${source.pageCount ? `, ${source.pageCount} page(s)` : ''}${source.tableCount ? `, ${source.tableCount} table(s)` : ''}${source.imgCount && source.imgCount > 0 ? `, ${source.imgCount} image(s)` : ''}${source.ocrFallback ? ', OCR applied locally' : ''}.`
      : busy
        ? busyLabel
        : 'Paste text below, or drop a file above.'

  return (
    <Panel title="Your resume" helper="Text is extracted and analyzed locally — nothing is uploaded.">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) onFile(file)
        }}
        disabled={busy}
        className={`w-full h-9 flex items-center gap-2 rounded-md border border-dashed px-3 text-[13px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
          dragOver ? 'border-accent bg-accent/5 text-accent' : 'border-edge text-muted hover:text-body hover:border-accent/50'
        }`}
      >
        {busy ? (
          <>
            <span className="size-3.5 rounded-full border-[1.5px] border-accent/30 border-t-accent animate-spin" />
            {busyLabel}
          </>
        ) : (
          <>
            <UploadCloud className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Drop or <span className="text-accent font-medium">browse</span> .pdf / .docx / .txt
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
      <div className="flex items-center gap-2 mt-2">
        <div className="relative shrink-0">
          <select
            aria-label="Load a sample resume"
            value=""
            onChange={(e) => {
              const sample = samples.find((s) => s.id === e.target.value)
              if (sample) onSample(sample)
            }}
            className="appearance-none h-7 text-[12px] pl-2 pr-6 rounded-md bg-panel2 border border-edge transition-colors hover:border-accent/50 cursor-pointer text-muted focus:outline-none focus:border-accent"
          >
            <option value="" disabled>
              Load a sample…
            </option>
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3.5 text-muted pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
        </div>
        <p className={`text-[11px] min-h-4 truncate ${error ? 'text-bad' : 'text-muted'}`} role="status">
          {error ?? status}
        </p>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Paste resume text here..."
        aria-label="Resume text"
        className={`${TEXTAREA_CLASSES} mt-2`}
      />
      <Toolbar text={text} onClear={() => onTextChange('')} />
    </Panel>
  )
}

interface JdPanelProps {
  text: string
  onChange: (value: string) => void
  onUseSample: () => void
}

export function JdPanel({ text, onChange, onUseSample }: JdPanelProps) {
  return (
    <Panel title="Job description" helper="Paste the full posting — keywords are extracted from this text.">
      <button
        type="button"
        onClick={onUseSample}
        className="inline-flex items-center gap-1.5 h-7 px-2 -ml-1 rounded-md text-[12px] text-muted hover:text-body transition-colors cursor-pointer"
      >
        <BookOpen className="size-3.5" aria-hidden="true" />
        Load example posting
      </button>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste job description here..."
        aria-label="Job description text"
        className={`${TEXTAREA_CLASSES} mt-1`}
      />
      <Toolbar text={text} onClear={() => onChange('')} meta="keywords are extracted from this text" />
    </Panel>
  )
}