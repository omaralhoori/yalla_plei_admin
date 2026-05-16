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

// Combine the API's separate date and time fields into a UTC ISO string for display
// and form pre-population.
// Handles all formats returned by the API:
//   full ISO with offset: "2026-05-18T21:17:00+03:00"  → parsed directly
//   full ISO with Z:      "2026-05-18T21:17:00Z"        → parsed directly
//   bare time:            "HH:MM:SS"                    → combined with date
export function matchApiToUtcIso(date: string, time: string): string {
  if (!date) return ''
  // time is already a full ISO datetime string — parse it (handles Z, +HH:MM, -HH:MM)
  if (time && time.includes('T')) {
    const d = new Date(time)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  // Fallback for bare "HH:MM:SS" time strings
  const datePart = date.split('T')[0].trim()
  const t = (time ?? '').replace(/Z$/i, '').replace(/\.\d+$/, '').trim() || '00:00:00'
  return `${datePart}T${t}Z`
}

// Converts local YYYY-MM-DD + HH:MM form inputs → UTC ISO string for API submission
export function localDateTimeToUtc(localDate: string, localTime: string): string {
  return new Date(`${localDate}T${localTime}:00`).toISOString()
}

// Converts local date + time form inputs into the UTC ISO strings the Match API expects:
//   date → "YYYY-MM-DDT00:00:00Z" (calendar date at UTC midnight)
//   time → "YYYY-MM-DDT19:00:00Z" (full UTC datetime of the match start)
export function localToUtcMatchParts(localDate: string, localTime: string): { date: string; time: string } {
  const utcIso = new Date(`${localDate}T${localTime}:00`).toISOString()
  const datePart = utcIso.split('T')[0]
  return {
    date: `${datePart}T00:00:00Z`,
    time: utcIso.replace(/\.\d+Z$/, 'Z'),
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
