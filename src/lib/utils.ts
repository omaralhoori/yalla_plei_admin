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

// UTC ISO → browser local-timezone date string
export function formatDate(utcStr: string): string {
  return new Date(utcStr).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// UTC ISO → browser local-timezone date + time string
export function formatDateTime(utcStr: string): string {
  return new Date(utcStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Converts local YYYY-MM-DD + HH:MM form inputs → UTC ISO string for API submission
export function localDateTimeToUtc(localDate: string, localTime: string): string {
  return new Date(`${localDate}T${localTime}:00`).toISOString()
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
