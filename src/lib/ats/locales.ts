import type { LocaleId, LocaleSetting } from '../types'

export const LOCALES: Record<LocaleId, LocaleSetting> = {
  us: {
    id: 'us',
    name: 'United States',
    flag: 'US',
    photoOk: false,
    minWords: 250,
    maxWords: 900,
    dateFormatNote: "M/D/YYYY (e.g. 03/2021 - Present)",
    requireLinkedIn: true,
  },
  eu: {
    id: 'eu',
    name: 'Europe (CV)',
    flag: 'EU',
    photoOk: true,
    minWords: 250,
    maxWords: 1200,
    dateFormatNote: 'D/M/YYYY or "Mon YYYY" (e.g. 03.2021 or March 2021)',
    requireLinkedIn: false,
  },
  jp: {
    id: 'jp',
    name: 'Japan',
    flag: 'JP',
    photoOk: true,
    minWords: 250,
    maxWords: 1200,
    dateFormatNote: 'YYYY/MM or YYYY.MM (e.g. 2021/03 - 2024/04)',
    extraDatePattern: /\b(?:19|20)\d{2}[/.]\d{1,2}\b/g,
    requireLinkedIn: false,
  },
  global: {
    id: 'global',
    name: 'Global / Remote',
    flag: 'G',
    photoOk: false,
    minWords: 250,
    maxWords: 900,
    dateFormatNote: 'any single consistent style (e.g. "Mar 2021 - Present")',
    requireLinkedIn: true,
  },
}

export const LOCALE_IDS = Object.keys(LOCALES) as LocaleId[]