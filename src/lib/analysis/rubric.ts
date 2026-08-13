/**
 * Scoring rubric — the single source of truth for how many points each check
 * level costs. Every constant in scoring.ts comes from here.
 *
 * Rationale (heuristic, calibrated against known-good resumes):
 * - format/bullet fails: -12 each (a handful of fails should visibly dent the
 *   category without zeroing it; warns are half of a fail).
 * - contact: every missing item costs -12; 2 misses → 76 (contact line is
 *   cheap to fix, so it never should drag far).
 * - misc (work auth, location, private data): fails are -40 / warns -20 —
 *   deliberate big swings, because sponsorship/location mismatches are the
 *   most common silent filter reasons and carry the most uncertainty.
 */
export const RUBRIC = {
  format: { fail: 12, warn: 6 },
  bullets: { fail: 12, warn: 6 },
  contact: { miss: 12 },
  misc: { fail: 40, warn: 20 },
} as const
