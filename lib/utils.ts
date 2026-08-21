import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}.${month}.${year}.`
}

/**
 * Determinističko formatiranje datuma i vremena (DD.MM.YYYY. HH:mm)
 */
export function formatDateTime(dateInput?: string | Date | null, fallback: string = "—"): string {
  if (!dateInput) return fallback

  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!d || isNaN(d.getTime())) return fallback

  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${day}.${month}.${year}. ${hours}:${minutes}`
}

/**
 * Determinističko formatiranje kratkog datuma i vremena (DD.MM. HH:mm)
 */
export function formatShortDateTime(dateInput?: string | Date | null, fallback: string = "—"): string {
  if (!dateInput) return fallback

  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!d || isNaN(d.getTime())) return fallback

  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${day}.${month}. ${hours}:${minutes}`
}

/**
 * Determinističko formatiranje samo vremena (HH:mm)
 */
export function formatTime(dateInput?: string | Date | null, fallback: string = "—"): string {
  if (!dateInput) return fallback

  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput
  if (!d || isNaN(d.getTime())) return fallback

  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

