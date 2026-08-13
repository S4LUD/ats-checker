# ATS Resume Checker

A client-only web app that simulates how applicant tracking systems (ATS) parse and score a resume against a job description. Paste or upload your resume, paste the job posting, and get a score with concrete, item-level fixes — keyword matching, formatting, bullets, contact info, and work-auth extras.

Everything runs **100% in your browser**. No backend, no accounts, no uploads — resume files are parsed locally and nothing ever leaves your machine.

## Features

- **Resume input** — paste text, upload `.pdf` / `.docx` / `.txt`, or drag & drop. PDFs are parsed with pdf.js, Word docs with mammoth; text is reconstructed line-by-line so section detection and bullet parsing work on real layouts.
- **Keyword analysis** — extracts keywords from the job description (skills lexicon, multi-word skills like `react native` / `ci cd`, phrases, and required vs. preferred signals) and reports **matched**, **under-used**, **missing**, and **irrelevant** keywords, plus "listed but never used in a bullet" stuffing detection. With no JD pasted, it instead detects skills directly in your resume.
- **Formatting & structure checks** — required sections, summary, length vs. locale targets, tables, images, two-column layout risk, date consistency, role/date-range parsing, special characters.
- **Bullet checks** — weak-verb openers, metrics in bullets, general bullet hygiene.
- **Contact checks** — email, phone, LinkedIn, location (US `City, ST` / ZIP plus international patterns and `Remote`).
- **Misc checks** — work authorization vs. JD, location alignment with the JD, protected personal data.
- **ATS presets** — simulate `Auto`, `Workday`, `Greenhouse`, `Taleo`, `Lever`, `iCIMS`, or `Ashby`, each with its own category weights, minimum keyword occurrences, and table/column penalties. "Compare all ATS systems" scores the same resume+JD across every preset side by side.
- **Locales** — `US`, `EU`, `Japan`, `Global` adjust word-count targets, expected date formats, photo tolerance, and LinkedIn requirements.
- **Actionable scoring** — 0–100 weighted score with a grade (Excellent / Good / Needs work / High risk), per-category breakdown bars, and a "potential after fixing the flagged items" estimate.
- **AI improvement tips** *(optional)* — generates general, prose-style improvement tips from any OpenAI-compatible endpoint (your own API key) or a local Ollama server. The key lives only in your browser's `localStorage` and requests go directly from the tab to the endpoint you enter.
- **Markdown report** — one-click download of the full analysis as a `.md` file.
- **Theming** — compact dark-by-default UI with a light mode toggle (persisted in `localStorage`).

## Getting started

Requires [Bun](https://bun.sh) (or npm — scripts are compatible).

```bash
bun install
bun run dev        # start the Vite dev server
bun run build      # type-check (tsc -b) + production build
bun run preview    # preview the production build
bun run lint       # oxlint
bun run test       # vitest (38 tests)
```

## How the analysis works

`src/App.tsx` wires the pipeline when both resume text and (optionally) a JD are present:

```
resume text + JD text
   ├─ extractKeywords(JdText)      → keyword candidates
   ├─ keywordAnalysis(resume, JD)  → matched / missing / under-used / irrelevant / list-only
   ├─ detectResumeSkills(resume)   → skills found when no JD is pasted
   ├─ checkFormatting / checkBullets / checkContact / checkMisc
   └─ computeScores(preset, locale) → weighted 0–100 + grade
        └─ compareAcrossPresets / computeScoreDeltas
```

Each check is a plain `Check` (`{ level: 'pass' | 'warn' | 'fail', mark, label, mono? }`) rendered by `CheckList`. Scores are **heuristics**, not a real ATS — the goal is to surface the same classes of problems recruiters and parsers actually see.

### Adding or tweaking rules

- Keywords: `src/lib/analysis/keywords.ts` (lexicon, multi-word skills, aliases, section-range detection).
- Checks: `src/lib/analysis/{format,bullets,contact,misc}.ts`.
- Weights/penalties: `src/lib/ats/presets.ts`; locale settings: `src/lib/ats/locales.ts`.

## AI improvement tips

The tips panel accepts any OpenAI-compatible `/v1/chat/completions` endpoint:

- **Bring your own key** — e.g. `https://api.openai.com/v1/chat/completions` with `gpt-4o-mini`. The key is stored only in `localStorage`.
- **Local Ollama** — leave the API key blank and point the endpoint at e.g. `http://localhost:11434/v1/chat/completions`. When accessing Ollama from a browser you must allow the origin: `OLLAMA_ORIGINS=http://localhost:5173` (see [Ollama CORS docs](https://github.com/ollama/ollama/blob/main/docs/faq.md#setting-environment-variables-on-windows)).

The model receives the JD, the resume, and the analyzer's summary, and returns general prose improvement tips (no numbered lists).

## Project structure

```
src/
├── App.tsx                     # layout, state, analysis pipeline wiring
├── components/
│   ├── InputPanel.tsx          # resume/JD panels: dropzone, samples, textareas
│   ├── ResultsCard.tsx         # score ring, category bars, sections, actions
│   ├── ScoreRing.tsx           # animated score ring + grade
│   ├── CompareTable.tsx        # all-presets comparison table
│   ├── CheckList.tsx           # pass/warn/fail check rows
│   ├── Chips.tsx               # keyword chips (matched/missing/low/neutral)
│   └── AiTips.tsx              # optional AI tips panel + endpoint settings
├── lib/
│   ├── analysis/               # keywords, format, bullets, contact, misc, scoring
│   ├── ats/                    # ATS presets + locale settings
│   ├── extract/                # pdf/docx/txt extraction, text helpers, samples
│   ├── report.ts               # markdown report generation
│   ├── ai.ts                   # OpenAI-compatible tips request
│   └── types.ts                # shared types
└── index.css                   # Tailwind v4 theme tokens (light/dark)
```

## Tech stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Vite 8](https://vite.dev) (with the React Compiler via `@vitejs/plugin-react` + `babel-plugin-react-compiler`)
- [Tailwind CSS v4](https://tailwindcss.com) with `@theme` design tokens and a `dark:` variant
- [lucide-react](https://lucide.dev) icons
- [pdfjs-dist](https://github.com/mozilla/pdf.js) + [mammoth](https://github.com/mwilliamson/mammoth.js) for local file parsing
- [Vitest](https://vitest.dev) + [oxlint](https://oxc.rs) for tests and linting

## Testing

```bash
bun run test
```

38 unit tests cover the AI client (settings storage, request validation, response handling), PDF extraction (line reconstruction, word counts), analysis rules (keywords, contact/location, formatting, section ranges), and report generation.

## Disclaimer

This is a heuristic simulator, not affiliated with any ATS vendor. Scores are estimates — no tool can exactly replicate a specific company's parsing and recruiter search behavior. Trust the fixes over the number.