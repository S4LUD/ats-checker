import type { AtsPreset, KeywordAnalysis, KeywordInfo, KeywordSuggestion } from '../types'
import { phraseForms, isNegated, stemWord, formatMonths } from './normalize'

const STOPWORDS = new Set(
  (
    'the a an and or but if then else for to of in on at by with from as is are was were be been being have has had do does did will would can could should shall may might must not no nor so too very just also such than that these those this its it\'s their there here what which who whom when where why how all any both each few more most other some only own same don now over under again further once above below up down out off per via between among through during before after into within toward upon across about against along around behind beyond plus minus zero one two three four five six seven eight nine ten per new years year job role position company work experience candidate applicants skills requirements responsibilities duties include includes including plus benefit benefits salary location remote hybrid onsite'
  )
    .toLowerCase()
    .split(/\s+/),
)

const MULTI_WORD_SKILLS = (
  'react native|react-native|github actions|gh actions|gha|ci cd|unit testing|stakeholder management|stakeholder engagement|project management|program management|account management|product management|product marketing|talent management|risk management|risk assessment|compliance audits|rest api|api integration|natural language processing|machine learning|deep learning|large language models|prompt engineering|generative ai|reinforcement learning|computer vision|data science|data analysis|data analytics|data engineering|data pipeline|data warehouse|data lake|business intelligence|financial modeling|variance analysis|pivot tables|customer success|lead generation|lead qualification|cold outreach|demand generation|inbound marketing|outbound sales|pipeline management|proposals contracts negotiations|vendor management|procurement management|internal controls|fraud detection|due diligence|portfolio management|asset allocation|investment analysis|underwriting|credit analysis|market research|competitor analysis|brand strategy|content strategy|content marketing|email marketing|marketing automation|ab testing|conversion rate optimization|crm onboarding|performance reviews|employee relations|employee engagement|payroll benefits|cash flow analysis|financial reporting|sec filings|process improvement|workflow optimization|knowledge management|technical writing|grant writing|public speaking|presentation skills|conflict resolution|negotiation mediation|critical care|patient care|case management|social work|clinical trials|academic writing|curriculum development|instructional design|adobe creative suite|video editing|audio editing|data entry|cold calling|customer service|itil|threat modeling|penetration testing|security audits|vulnerability assessment|malware analysis|digital forensics|incident response|scrum master|go-to-market|user research|usability testing|ux design|ui design|web design|mobile design|responsive design|pair programming|code review|feature flags|signal processing|control systems|embedded systems|time series forecasting|cohort analysis|funnel analysis|retention analysis|churn analysis|unit economics|payback period|green card sponsorship|power automate|power platform|low-code|no-code|message queues|web sockets|event-driven|event sourcing|system design|database design|load balancing|reverse proxy|rate limiting|async programming|functional programming|design patterns|clean code|platform engineering|cloud infrastructure|incident management|capacity planning|architecture design|payment gateways|search engine optimization|social media content marketing|agile ceremonies|sprint planning|kanban boards|performance testing|load testing|stress testing|api testing|contract testing|e2e testing|tdd bdd'
)
  .toLowerCase()
  .split('|')

const SKILL_LEXICON = (
  'expo python java javascript typescript react react.js next.js node node.js express django flask ruby rails go golang swift kotlin c c++ c# .net php laravel perl scala rust haskell sql mysql postgresql postgres sql server oracle db mongodb redis cassandra elasticsearch neo4j firebase supabase graphql rest api soap grpc aws amazon web services azure gcp google cloud platform google cloud docker kubernetes k8s terraform ansible jenkins github gitlab bitbucket git ci cd pipelines linux unix bash powershell shell scripting vim windows macos hadoop spark kafka airflow snowflake bigquery redshift dbt tableau power bi excel google sheets looker mixpanel amplitude datadog grafana prometheus sentry new relic orchestration microservices serverless lambda ec2 s3 rds sagemaker vertex ai openai tensorflow pytorch keras scikit-learn pandas numpy scipy matplotlib seaborn jupyter rstudio spss stata sas intelligent automation rpa uipath salesforce sap oracle financials netsuite quickbooks xero erp crm hubspot salesloft outreach zendesk intercom figma sketch adobe photoshop illustrator indesign premiere after effects word powerpoint outlook teams zoom slack notion asana trello jira confluence clickup linear agile scrum kanban waterfall lean six sigma safe okr kpi sla qa testing unit testing integration testing selenium cypress playwright jest mocha chai pytest junit vmware hyper-v vsphere active directory okta sso saml oauth jwt tls ssl vpn firewall networking tcp ip http html5 css scss sass tailwind bootstrap jquery webpack vite babel typescript redux nginx apache wordpress shopify stripe square paypal payment gateways data analysis data analytics data engineering data science machine learning deep learning nlp natural language processing computer vision reinforcement learning llm large language models prompt engineering generative ai finetuning fine-tuning mlops etl elt data pipeline data warehouse data lake business intelligence analytics dashboards forecasting budgeting financial modeling variance analysis pivot tables vlookup roi customer success account management upselling cross-selling lead generation lead qualification prospecting cold outreach demand generation inbound marketing outbound sales pipeline management quoting proposals contracts negotiations stakeholder management stakeholder engagement project management program management event planning logistics vendor management procurement contract management risk assessment risk management compliance audits regulatory sox gdpr hipaa iso 9001 iso 27001 soc 2 internal controls fraud detection due diligence portfolio management asset allocation investment analysis underwriting credit analysis market research competitor analysis swot pestel brand strategy content strategy content marketing copywriting seo search engine optimization sem ppc google ads facebook ads linkedin ads email marketing email automation marketing automation ab testing a b testing conversion rate optimization crm onboarding training development coaching mentoring hiring recruiting sourcing interviewing candidate evaluation employee relations performance reviews talent management hr employee engagement diversity inclusion payroll benefits administration us gaap ifrs reconciliation journal entries month-end close internal audit external audit tax preparation corporate tax cash flow analysis financial reporting sec filings ipo mergers acquisitions due diligence compensation restructuring process improvement workflow optimization documentation sop knowledge management technical writing grant writing editing proofreading public speaking presentation skills facilitation conflict resolution negotiation mediation counseling nursing icu er critical care patient care case management social work clinical trials research publications peer review academic writing curriculum development e-learning instructional design adobe creative suite video editing audio editing photography data entry cold calling telemarketing customer service support ticketing slas helpdesk itil threat modeling penetration testing security audits vulnerability assessment malware analysis digital forensics incident response siem soc certified ethical hacking ceh cissp cism pmp scrum master csm product management product marketing go-to-market user research usability testing wireframing prototyping ux design ui design web design mobile design responsive design accessibility wcag a11y agile ceremonies sprint planning standups retros kanban boards qa automation performance testing load testing stress testing api testing contract testing e2e end-to-end testing tdd bdd pair programming code review deployment rollback canary blue-green feature flags signal processing control systems plc scada robotics iot embedded systems firmware fpga verilog vhdl cad solidworks autocad matlab simulink r statistical modeling hypothesis testing regression logistic regression clustering classification recommendation systems a/b testing time series forecasting survival analysis cohort analysis funnel analysis retention analysis churn analysis north star metric aarrr unit economics ltv cac payback period hiring manager green card sponsorship visa office365 ms 365 sharepoint power automate powerapps dynamics 365 business central power platform low-code no-code api integration webhooks middleware esb soa restful json xml yaml markdown git ops devops sre platform engineering backend frontend full-stack full stack mobile iot cloud infrastructure scalability reliability observability incident management runbooks sla on-call capacity planning architecture design system design database design normalization caching cdn load balancing reverse proxy message queues pub/sub rabbitmq kafka streams web sockets event-driven event sourcing saga pattern circuit breaker rate limiting concurrency multithreading async programming functional programming oop design patterns clean code refactoring testing driven development'
)
  .toLowerCase()
  .split(/\s+/)

export const ALL_SKILLS = Array.from(new Set([...SKILL_LEXICON, ...MULTI_WORD_SKILLS]))

/** canonical term -> phrasing variants that should count as the same keyword */
export const ALIASES: Record<string, string[]> = {
  kubernetes: ['k8s', 'kube'],
  'machine learning': ['ml'],
  'deep learning': ['dl'],
  'natural language processing': ['nlp'],
  'large language models': ['llm', 'llms'],
  'rest api': ['restful api', 'restful apis', 'rest apis', 'restful services'],
  'ux design': ['user experience design', 'ux research'],
  'ui design': ['user interface design'],
  accessibility: ['a11y'],
  e2e: ['end-to-end', 'end to end'],
  'e2e testing': ['end-to-end testing', 'end to end testing'],
  'ci cd': ['ci/cd', 'ci-cd', 'cicd', 'ci/cd pipelines'],
  javascript: ['js'],
  typescript: ['ts'],
  postgresql: ['postgres'],
  '.net': ['dotnet', 'dot net'],
  'c#': ['csharp'],
  salesforce: ['sfdc'],
  microservices: ['micro service', 'micro-services', 'microservice'],
  etl: ['extract transform load'],
  'cloud infrastructure': ['cloud infra'],
  'work authorization': ['authorized to work', 'work authorisation'],
  'project management': ['pm'],
  'google cloud platform': ['gcp'],
  'amazon web services': ['aws cloud'],
}

/** every term variant (canonical or alias) -> its canonical form */
const CANONICAL_OF: Record<string, string> = {}
for (const [canon, variants] of Object.entries(ALIASES)) {
  for (const v of [canon, ...variants]) CANONICAL_OF[v.toLowerCase()] = canon
}

/** canonical term plus every spelling variant that means the same thing */
function synonyms(term: string): string[] {
  const canon = CANONICAL_OF[term.toLowerCase()] ?? term.toLowerCase()
  return [canon, ...(ALIASES[canon] ?? [])]
}

const DEFAULT_LINE_WEIGHT = 0.7

const JD_SECTION_RULES: Array<{ key: string; weight: number; required?: boolean; preferred?: boolean; re: RegExp }> = [
  {
    key: 'requirements',
    weight: 1,
    required: true,
    re: /^(?:minimum\s+)?(?:requirements|required|qualifications|required\s+qualifications|must\s+have|must-haves|candidate\s+profile|ideal\s+candidate|what\s+we\s+(?:require|need)|we\s+(?:require|need)|what\s+you\s+(?:bring|have)|you\s+have|skills\s+required)\s*:?\s*$/i,
  },
  {
    key: 'responsibilities',
    weight: 0.8,
    re: /^(?:responsibilities|what\s+you'?ll\s+do|what\s+you\s+will\s+do|the\s+role|key\s+responsibilities|duties|about\s+the\s+(?:role|position|job)|daily\s+responsibilities|day-to-day|main\s+tasks|your\s+day\s+to\s+day)\s*:?\s*$/i,
  },
  {
    key: 'preferred',
    weight: 0.5,
    preferred: true,
    re: /^(?:nice\s+to\s+have|nice-to-haves|preferred|preferred\s+(?:skills|qualifications)|bonus|a\s+plus|plus\s+points?|extra\s+credit)\s*:?\s*$/i,
  },
  {
    key: 'intro',
    weight: 0.45,
    re: /^(?:about\s+us|about\s+the\s+company|company\s+overview|who\s+we\s+are|our\s+mission)\s*:?\s*$/i,
  },
]

interface LineClass {
  weight: number
  required: boolean
  preferred: boolean
}

function classifyJdLine(line: string): LineClass & { header: boolean } {
  const t = line.trim()
  if (t.length > 60) return { weight: DEFAULT_LINE_WEIGHT, required: false, preferred: false, header: false }
  for (const rule of JD_SECTION_RULES) {
    if (rule.re.test(t)) {
      return { weight: rule.weight, required: !!rule.required, preferred: !!rule.preferred, header: true }
    }
  }
  return { weight: DEFAULT_LINE_WEIGHT, required: false, preferred: false, header: false }
}

/** tag every JD line with the importance of the section it belongs to */
export function sectionOfLines(jd: string): Array<{ line: string; weight: number; required: boolean; preferred: boolean }> {
  let current: LineClass = { weight: DEFAULT_LINE_WEIGHT, required: false, preferred: false }
  return jd
    .split(/\r?\n/)
    .map((line) => {
      const cls = classifyJdLine(line)
      if (cls.header) current = cls
      return { line, weight: current.weight, required: current.required, preferred: current.preferred }
    })
    .filter((l) => l.line.trim().length > 0)
}

const escapedCache = new Map<string, RegExp>()

function termRegex(term: string): RegExp {
  let re = escapedCache.get(term)
  if (!re) {
    re = new RegExp(`\\b${escapeRegExp(term.toLowerCase())}\\b`, 'g')
    escapedCache.set(term, re)
  }
  return re
}

export function countOccurrences(text: string, term: string): number {
  const matches = text.toLowerCase().match(termRegex(term))
  return matches ? matches.length : 0
}

/** occurrences of a term plus every one of its known spellings, either direction */
export function countWithAliases(text: string, term: string): number {
  let n = 0
  for (const variant of synonyms(term)) n += countOccurrences(text, variant)
  return n
}

/** stemmed token stream of a document; hyphens and slashes count as word separators */
function stemmedTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[/-]/g, ' ')
    .split(/[^a-z0-9+#.-]+/i)
    .filter((t) => t.length > 1)
    .map(stemWord)
}

/**
 * inflection-tolerant variant matching (plurals/verb endings), used as a bonus
 * signal when the exact term is absent — matches on stemmed token sequences so
 * "data pipelines" counts toward "data pipeline" and "react-native" toward
 * "react native".
 */
function countInflected(text: string, term: string): number {
  const seq = phraseForms(term)[0]
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .map(stemWord)
  if (seq.length === 0) return 0
  const doc = stemmedTokens(text)
  let n = 0
  for (let i = 0; i + seq.length <= doc.length; i++) {
    let ok = true
    for (let j = 0; j < seq.length; j++) {
      if (doc[i + j] !== seq[j]) {
        ok = false
        break
      }
    }
    if (ok) n++
  }
  return n
}

/**
 * Occurrences that are NOT preceded by a negation/hedging cue
 * ("no experience with Python", "basic knowledge of React" → not counted).
 */
export function countUnnegated(text: string, term: string): number {
  let n = 0
  for (const variant of synonyms(term)) {
    const matches = text.matchAll(termRegex(variant))
    for (const m of matches) {
      if (!isNegated(text, m.index ?? 0)) n++
    }
  }
  return n
}

/** unnegated occurrences, plus inflected forms when the term is genuinely absent */
export function countSmart(text: string, term: string): { count: number; inflected: boolean } {
  const exact = countWithAliases(text, term)
  const unnegated = countUnnegated(text, term)
  if (unnegated > 0) return { count: unnegated, inflected: false }
  if (exact === 0) {
    const inf = countInflected(text, term)
    if (inf > 0) return { count: inf, inflected: true }
  }
  return { count: 0, inflected: false }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function hasTerm(text: string, term: string): boolean {
  return countWithAliases(text, term) > 0
}

function isStopword(term: string): boolean {
  const t = term.toLowerCase()
  return STOPWORDS.has(t) || t.length < 3
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.-]/)
    .filter((t) => t.length > 1)
}

/** does the JD (or an alias) mention this skill, and what section weight applies */
function scanSkillInJd(jdLines: Array<{ line: string; weight: number; required: boolean; preferred: boolean }>, skill: string): KeywordInfo | null {
  let count = 0
  let best: { weight: number; required: boolean; preferred: boolean } | null = null
  for (const ln of jdLines) {
    const n = countWithAliases(ln.line, skill)
    if (n === 0) continue
    count += n
    if (!best || ln.weight > best.weight || (ln.weight === best.weight && ln.required && !best.required)) {
      best = { weight: ln.weight, required: ln.required, preferred: ln.preferred }
    }
  }
  if (!best) return null
  return {
    term: skill,
    source: 'skill',
    count,
    weight: best.weight,
    required: best.required,
    preferred: best.preferred,
  }
}

/** collapse alias spellings into their canonical term, merging counts and weights */
function collapseSynonyms(items: KeywordInfo[]): KeywordInfo[] {
  const byCanon = new Map<string, KeywordInfo>()
  for (const item of items) {
    const canon = CANONICAL_OF[item.term] ?? item.term
    const existing = byCanon.get(canon)
    if (!existing) {
      byCanon.set(canon, { ...item, term: canon })
      continue
    }
    byCanon.set(canon, {
      ...existing,
      term: canon,
      count: existing.count + item.count,
      weight: Math.max(existing.weight, item.weight),
      required: existing.required || item.required,
      preferred: existing.preferred || item.preferred,
      source: existing.source === item.source ? existing.source : 'phrase',
    })
  }
  return Array.from(byCanon.values())
}

export function extractKeywords(jd: string): KeywordInfo[] {
  const jdLower = jd.toLowerCase()
  const lines = sectionOfLines(jd)
  const tokens = tokenize(jd)
  const freq: Record<string, number> = {}
  for (const t of tokens) {
    if (!STOPWORDS.has(t)) freq[t] = (freq[t] ?? 0) + 1
  }

  const found: KeywordInfo[] = []
  const covered = new Set<string>()
  for (const skill of ALL_SKILLS) {
    if (covered.has(skill)) continue
    const info = scanSkillInJd(lines, skill)
    if (!info) continue
    for (const variant of synonyms(skill)) covered.add(variant)
    found.push(info)
  }

  const phraseRe = /([A-Z][A-Za-z0-9+#.-]*(?:\s+(?:[A-Z][A-Za-z0-9+#.-]*|of|and|for|in|on|with|to|the)){1,3})/g
  const seen = new Set<string>()
  for (const ln of lines) {
    let m: RegExpExecArray | null
    while ((m = phraseRe.exec(ln.line)) !== null) {
      const phrase = m[1].trim().toLowerCase()
      const words = phrase.split(/\s+/)
      const wordy = words.filter((w) => !STOPWORDS.has(w))
      if (wordy.length < 2) continue
      if (seen.has(phrase)) continue
      if (found.some((f) => f.term === phrase)) continue
      const skillWords = new Set(found.filter((f) => f.source === 'skill').flatMap((f) => f.term.split(/\s+/)))
      if (wordy.every((w) => skillWords.has(w))) continue
      seen.add(phrase)
      found.push({
        term: phrase,
        source: 'phrase',
        count: countOccurrences(jdLower, phrase),
        weight: ln.weight,
        required: ln.required,
        preferred: ln.preferred,
      })
    }
  }

  for (const t of Object.keys(freq)) {
    if (freq[t] >= 3 && !found.some((f) => f.term === t)) {
      found.push({ term: t, source: 'repeated', count: freq[t], weight: DEFAULT_LINE_WEIGHT, required: false, preferred: false })
    }
  }

  found.sort((a, b) => {
    const rank = (k: KeywordInfo): number => k.count * k.weight * (k.source === 'skill' ? 2 : k.source === 'phrase' ? 1.5 : 1)
    return rank(b) - rank(a) || b.term.length - a.term.length
  })

  const dedupe = new Map<string, KeywordInfo>()
  for (const f of collapseSynonyms(found)) dedupe.set(f.term, f)
  return Array.from(dedupe.values()).slice(0, 45)
}

const LIST_SECTION_RE = /^(?:technical\s+)?(?:skills|core\s+competencies|competencies|technologies|tech\s+stack|skill\s+set|languages\s+and\s+technologies|tools?|certifications?|licenses?|languages?)\s*:?$/i

/** lines whose nearest preceding header is a pure list section (skills/tools/certs) */
function listSectionRanges(lines: string[]): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = []
  let inList = false
  let start = 0
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    const isHeader = t.length > 0 && t.length <= 40 && (LIST_SECTION_RE.test(t) || /^(?:experience|work\s+experience|education|education\s+history|work\s+history|professional\s+experience|employment\s+history|summary|professional\s+summary|profile|projects|selected\s+projects|awards|volunteer|publications|research)\s*:?$/i.test(t))
    if (isHeader) {
      if (inList) ranges.push({ start, end: i - 1 })
      inList = LIST_SECTION_RE.test(t)
      start = i
    }
  }
  if (inList) ranges.push({ start, end: lines.length - 1 })
  return ranges
}

function lineIndexOf(lines: string[], targetIndex: number): number {
  let acc = 0
  for (let i = 0; i < lines.length; i++) {
    const next = acc + lines[i].length + 1
    if (targetIndex < next) return i
    acc = next
  }
  return lines.length - 1
}

/** every occurrence of the term (or an alias) lives inside skill-list sections -> stuffing signal */
function isListOnly(resumeLower: string, lines: string[], listRanges: Array<{ start: number; end: number }>, term: string): boolean {
  const occ: RegExpMatchArray[] = []
  for (const variant of synonyms(term)) occ.push(...resumeLower.matchAll(termRegex(variant)))
  if (occ.length === 0) return false
  return occ.every((m) => {
    const li = lineIndexOf(lines, m.index ?? 0)
    return listRanges.some((r) => li >= r.start && li <= r.end)
  })
}

/** every skill the resume mentions (against the lexicon), canonical terms with counts — used when no JD is provided */
export function detectResumeSkills(resumeText: string): KeywordInfo[] {
  const lower = resumeText.toLowerCase()
  const seen = new Set<string>()
  const found: KeywordInfo[] = []
  for (const skill of [...MULTI_WORD_SKILLS, ...SKILL_LEXICON]) {
    const canon = CANONICAL_OF[skill] ?? skill
    if (seen.has(canon)) continue
    const occ = countSmart(lower, skill)
    if (occ.count === 0) continue
    for (const variant of synonyms(skill)) seen.add(variant)
    found.push({ term: canon, source: 'skill', count: occ.count, weight: DEFAULT_LINE_WEIGHT, required: false, preferred: false })
  }
  return found.sort((a, b) => b.count - a.count || a.term.localeCompare(b.term)).slice(0, 60)
}

export function keywordAnalysis(
  resumeText: string,
  keywords: KeywordInfo[],
  preset: AtsPreset,
  opts?: { semanticHits?: string[] },
): KeywordAnalysis {
  const resumeLower = resumeText.toLowerCase()
  const semanticHits = opts?.semanticHits ?? []
  const lines = resumeText.split(/\r?\n/)
  const listRanges = listSectionRanges(lines)
  const matched: KeywordInfo[] = []
  const missing: string[] = []
  const low: KeywordInfo[] = []
  const listOnly: string[] = []
  const inflected: string[] = []

  for (const kw of keywords) {
    if (semanticHits.includes(kw.term)) {
      matched.push({ ...kw, count: 1 })
      continue
    }
    const occ = countSmart(resumeLower, kw.term)
    if (occ.count > 0) {
      if (occ.inflected) inflected.push(kw.term)
      if (occ.count < preset.minOccurrences) low.push({ ...kw, count: occ.count })
      else matched.push({ ...kw, count: occ.count })
      if (kw.source === 'skill' && listRanges.length > 0 && isListOnly(resumeLower, lines, listRanges, kw.term)) {
        listOnly.push(kw.term)
      }
    } else {
      missing.push(kw.term)
    }
  }

  const resumeTokens = new Set(tokenize(resumeText).filter((t) => !isStopword(t)))
  const irrelevant: string[] = []
  for (const t of resumeTokens) {
    if (ALL_SKILLS.includes(t) && !keywords.some((k) => k.term === t)) irrelevant.push(t)
    if (irrelevant.length >= 8) break
  }

  let keywordWeight = 0
  for (const kw of keywords) keywordWeight += kw.weight

  let covered = 0
  for (const kw of matched) {
    const semanticBonus = semanticHits.includes(kw.term) ? 0.9 : 1
    covered += kw.weight * (listOnly.includes(kw.term) ? 0.85 : 1) * semanticBonus
  }
  for (const kw of low) {
    covered += kw.weight * 0.5
  }
  const score = keywordWeight > 0 ? (covered / keywordWeight) * 100 : 0

  return { matched, missing, low, irrelevant: irrelevant.slice(0, 8), listOnly, inflected, semanticHits, score, total: keywords.length, keywordWeight }
}

export function buildKeywordSuggestions(
  keywords: KeywordInfo[],
  missing: string[],
  low: KeywordInfo[],
  minOccurrences: number,
  skillMonths?: Map<string, number>,
): KeywordSuggestion[] {
  const missingKw = keywords
    .filter((k) => missing.includes(k.term))
    .sort((a, b) => Number(b.required) - Number(a.required) || b.weight - a.weight || b.count - a.count)
    .slice(0, 8)

  const missingSugs: KeywordSuggestion[] = missingKw.map((k) => {
    let action: string
    if (k.source === 'skill') {
      const depth = skillMonths?.get(k.term)
      const depthNote = depth && depth >= 6 ? ` Your resume shows ~${formatMonths(depth)} of ${k.term} — make that explicit in a bullet.` : ''
      action = `Add "${k.term}" to your Skills section and use it in at least one bullet under Experience.${depthNote}`
    } else if (k.source === 'phrase') {
      action = `Work "${k.term}" into a bullet with a concrete example — add a number if you can.`
    } else {
      action = `Mention "${k.term}" in your summary or a bullet — the JD repeats it ${k.count}x.`
    }
    if (k.preferred) action += ' Nice-to-have: only worth a line if it fits naturally.'
    return { term: k.term, action, required: k.required }
  })

  const lowSugs: KeywordSuggestion[] = low
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((k) => ({
      term: k.term,
      required: k.required,
      action: `You mention "${k.term}" only ${k.count === 1 ? 'once' : `${k.count} times`}; this preset expects it at least ${minOccurrences}x. Use it in one more context (e.g. a project bullet).`,
    }))

  return [...missingSugs, ...lowSugs].slice(0, 10)
}