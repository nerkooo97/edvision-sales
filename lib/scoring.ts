import type { Lead } from "./appwrite/leads"
import type { Company } from "./appwrite/companies"

export interface LeadScoreInfo {
  score: number // 0 - 100
  tier: "hot" | "warm" | "cold"
  label: string
  reasons: string[]
}

export function calculateLeadScore(lead: Lead, company?: Company | null): LeadScoreInfo {
  let score = 30 // base score
  const reasons: string[] = []

  const companyObj =
    typeof lead.company === "object" && lead.company
      ? lead.company
      : company || null

  // 1. Company Size & Source
  if (companyObj?.company_size) {
    const size = companyObj.company_size.toUpperCase()
    if (size.includes("VELIKA")) {
      score += 25
      reasons.push("Velika kompanija (+25)")
    } else if (size.includes("SREDNJA")) {
      score += 15
      reasons.push("Srednja kompanija (+15)")
    } else if (size.includes("MALA")) {
      score += 5
      reasons.push("Mala kompanija (+5)")
    }
  }

  // 2. Direct Channels availability
  if (lead.has_phone || (companyObj?.phones && companyObj.phones.length > 0)) {
    score += 15
    reasons.push("Dostupan direktni telefon (+15)")
  }

  if (lead.has_email || companyObj?.email) {
    score += 10
    reasons.push("Dostupna email adresa (+10)")
  }

  // 3. Website Opportunity
  if (!lead.has_web && !companyObj?.website) {
    score += 20
    reasons.push("Nema web stranicu — visoka potreba (+20)")
  } else {
    // Has web, check analysis issues
    const issuesCount = lead.analysis?.length || 0
    if (issuesCount >= 2) {
      score += 15
      reasons.push(`${issuesCount} uočena nedostatka na sajtu (+15)`)
    } else if (issuesCount === 1) {
      score += 8
      reasons.push("1 uočen nedostatak (+8)")
    }
  }

  // 4. Status progression
  if (lead.status === "U pregovorima") {
    score += 20
    reasons.push("U fazi pregovora (+20)")
  } else if (lead.status === "Kvalifikovan") {
    score += 10
    reasons.push("Kvalifikovan lead (+10)")
  }

  // Clamp score between 10 and 99
  const finalScore = Math.min(99, Math.max(10, score))

  let tier: "hot" | "warm" | "cold" = "cold"
  let label = "Cold Lead"

  if (finalScore >= 75) {
    tier = "hot"
    label = "🔥 Hot Lead"
  } else if (finalScore >= 50) {
    tier = "warm"
    label = "⚡ Warm Lead"
  } else {
    tier = "cold"
    label = "❄️ Cold Lead"
  }

  return {
    score: finalScore,
    tier,
    label,
    reasons,
  }
}

/**
 * Generates a direct WhatsApp link with prefilled message
 */
export function getWhatsAppLink(phone: string, companyName?: string): string {
  if (!phone) return ""
  // Clean phone: remove non-digits
  let cleanPhone = phone.replace(/\D/g, "")
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "387" + cleanPhone.slice(1)
  }
  if (!cleanPhone.startsWith("387") && cleanPhone.length === 8) {
    cleanPhone = "387" + cleanPhone
  }

  const name = companyName ? ` za ${companyName}` : ""
  const message = encodeURIComponent(
    `Poštovani, javljam se ispred digitalne agencije ED Vision u vezi sa unapređenjem digitalnog prisustva i web rješenja${name}. Da li biste bili otvoreni za kratak razgovor ove sedmice?`
  )

  return `https://wa.me/${cleanPhone}?text=${message}`
}
