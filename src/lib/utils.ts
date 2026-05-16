import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// All prices in Jordanian Dinar — e.g. "15.00 JOD"
export function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat('en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' JOD'
  )
}

// UTC ISO string (or YYYY-MM-DD date-only) → browser local-timezone date string
// Date-only strings are treated as UTC midnight to avoid off-by-one-day in negative-offset zones.
export function formatDate(utcStr: string | undefined | null): string {
  if (!utcStr) return '—'
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(utcStr.trim())
    ? `${utcStr.trim()}T00:00:00Z`
    : utcStr
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

// UTC ISO string → browser local-timezone date + time string
export function formatDateTime(utcStr: string | undefined | null): string {
  if (!utcStr) return '—'
  const d = new Date(utcStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Combine the API's separate date ("YYYY-MM-DD") and time ("HH:MM:SS") fields into
// a proper UTC ISO string for display and form pre-population.
// Strips trailing Z, milliseconds, and date prefixes from the time component.
export function matchApiToUtcIso(date: string, time: string): string {
  if (!date) return ''
  const d = date.split('T')[0].trim()
  const rawT = (time ?? '').split('T').pop()!
  const t = rawT.replace(/Z$/i, '').replace(/\.\d+$/, '').trim() || '00:00:00'
  return `${d}T${t}Z`
}

// Converts local YYYY-MM-DD + HH:MM form inputs → UTC ISO string for API submission
export function localDateTimeToUtc(localDate: string, localTime: string): string {
  return new Date(`${localDate}T${localTime}:00`).toISOString()
}

// Converts local date + time form inputs into the UTC date + time parts the Match API expects:
//   date → "YYYY-MM-DD" (UTC)
//   time → "HH:MM:SS"   (UTC)
export function localToUtcMatchParts(localDate: string, localTime: string): { date: string; time: string } {
  const utcIso = new Date(`${localDate}T${localTime}:00`).toISOString()
  return {
    date: utcIso.split('T')[0],
    time: utcIso.split('T')[1].replace(/\.\d+Z$/, ''),
  }
}

// Extracts YYYY-MM-DD in the browser's local timezone from a UTC ISO string
export function utcToLocalDate(utcStr: string): string {
  const d = new Date(utcStr)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// Extracts HH:MM in the browser's local timezone from a UTC ISO string
export function utcToLocalTime(utcStr: string): string {
  const d = new Date(utcStr)
  return [
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
  ].join(':')
}
