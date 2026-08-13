import { useState } from 'react'
import { Briefcase, ChevronDown, Code2, Link2, Mail, MapPin, Phone, User } from 'lucide-react'
import type { ParsedResume, ParsedRole } from '../lib/parse/resume-parser'
import { formatMonths } from '../lib/analysis/normalize'

function ContactChip({ icon, label }: { icon: React.ReactNode; label: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      {icon}
      <span className={label ? 'text-body/90 truncate max-w-56' : ''}>{label ?? '—'}</span>
    </span>
  )
}

function RoleRow({ role }: { role: ParsedRole }) {
  const range = [role.dateRange.start, role.dateRange.end].filter(Boolean).join(' — ')
  return (
    <li className="text-[12px] text-body/90 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className="font-medium">{role.title}</span>
      {role.company && (
        <>
          <span className="text-muted">at</span>
          <span className="text-body/80">{role.company}</span>
        </>
      )}
      {range && <span className="text-muted tabular-nums ml-auto">{range}</span>}
      {role.dateRange.months !== null && (
        <span className="text-muted tabular-nums text-[11px]">{formatMonths(role.dateRange.months)}</span>
      )}
      <span className="w-full text-[11px] text-muted">
        {role.bullets.length} bullet{role.bullets.length === 1 ? '' : 's'}
      </span>
    </li>
  )
}

export function ParserPreview({ parsed }: { parsed: ParsedResume | null }) {
  const [open, setOpen] = useState(false)
  if (!parsed) return null

  const depth = Array.from(parsed.skillMonths.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <div className="border border-edge rounded-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium hover:bg-panel2/60 transition-colors cursor-pointer"
      >
        <User className="size-3.5 text-muted" aria-hidden="true" />
        Parser preview
        <span className="text-muted font-normal truncate ml-1">
          {parsed.name ?? 'name not detected'} · {parsed.roles.length} role(s) detected
        </span>
        <ChevronDown
          className={`size-3.5 text-muted ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
            <ContactChip icon={<User className="size-3.5" aria-hidden="true" />} label={parsed.name} />
            <ContactChip icon={<Mail className="size-3.5" aria-hidden="true" />} label={parsed.contact.email} />
            <ContactChip icon={<Phone className="size-3.5" aria-hidden="true" />} label={parsed.contact.phone} />
            <ContactChip icon={<MapPin className="size-3.5" aria-hidden="true" />} label={parsed.contact.location} />
            <ContactChip icon={<Link2 className="size-3.5" aria-hidden="true" />} label={parsed.contact.linkedIn} />
            <ContactChip icon={<Code2 className="size-3.5" aria-hidden="true" />} label={parsed.contact.github} />
          </div>

          {parsed.roles.length > 0 && (
            <div>
              <p className="text-[12px] font-medium mb-1 flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-muted" aria-hidden="true" />
                Experience
              </p>
              <ul className="space-y-1.5">
                {parsed.roles.map((r, i) => (
                  <RoleRow key={`${r.title}-${i}`} role={r} />
                ))}
              </ul>
            </div>
          )}

          {depth.length > 0 && (
            <div>
              <p className="text-[12px] font-medium mb-1">Skill depth (months in roles that mention them)</p>
              <div className="flex flex-wrap gap-1.5">
                {depth.map(([skill, months]) => (
                  <span key={skill} className="inline-flex items-center gap-1 text-[11px] tabular-nums px-1.5 py-0.5 rounded border border-edge bg-panel2/60 text-muted">
                    {skill}
                    <span className="text-body/80">{formatMonths(months)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted">
            Heuristic local parsing — what a real ATS may extract. Not a guarantee of how any vendor parses your file.
          </p>
        </div>
      )}
    </div>
  )
}
