import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const BUSINESS_TIME_ZONE = "Europe/Sarajevo"

function getSarajevoDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<"year" | "month" | "day" | "hour" | "minute", string>
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determinističko formatiranje datuma (DD.MM.YYYY.)
 * Sprječava SSR/Client hydration greške uzrokovane razlikama u sistemskim ICU lokalima.
 */
export function formatDate(dateInput?: string | Date | null, fallback: string = "—"): string {
  if (!dateInput) return fallback

  if (typeof dateInput === "string") {
    // Čisti YYYY-MM-DD format (npr. follow_up_date)
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, y, m, d] = match
      return `${d}.${m}.${y}.`
    }
  }

  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!d || isNaN(d.getTime())) return fallback

  const { day, month, year } = getSarajevoDateParts(d)
  return `${day}.${month}.${year}.`
}

/**
 * Determinističko formatiranje datuma i vremena (DD.MM.YYYY. HH:mm)
 */
export function formatDateTime(dateInput?: string | Date | null, fallback: string = "—"): string {
  if (!dateInput) return fallback

  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!d || isNaN(d.getTime())) return fallback

  const { day, month, year, hour, minute } = getSarajevoDateParts(d)
  return `${day}.${month}.${year}. ${hour}:${minute}`
}

/**
 * Determinističko formatiranje kratkog datuma i vremena (DD.MM. HH:mm)
 */
export function formatShortDateTime(dateInput?: string | Date | null, fallback: string = "—"): string {
  if (!dateInput) return fallback

  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!d || isNaN(d.getTime())) return fallback

  const { day, month, hour, minute } = getSarajevoDateParts(d)
  return `${day}.${month}. ${hour}:${minute}`
}

/**
 * Determinističko formatiranje samo vremena (HH:mm)
 */
export function formatTime(dateInput?: string | Date | null, fallback: string = "—"): string {
  if (!dateInput) return fallback

  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!d || isNaN(d.getTime())) return fallback

  const { hour, minute } = getSarajevoDateParts(d)
  return `${hour}:${minute}`
}

