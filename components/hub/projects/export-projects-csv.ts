import { toCsv } from "@/lib/hub/csv"
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/hub/labels"
import type { HubProjectSummary } from "@/lib/hub/types"
import { formatDate } from "@/lib/utils"

const MONEY_HEADER = "Vrijednost (KM)"

const HEADERS = [
  "Šifra",
  "Projekat",
  "Klijent",
  "Tip",
  MONEY_HEADER,
  "Status",
  "Prioritet",
  "Voditelj",
  "Datum ponude",
  "Datum dogovora",
  "Početak",
  "Planirani rok",
  "Stvarni završetak",
  "Datum fakture",
  "Broj ugovora",
  "Zadaci (završeno/ukupno)",
]

// A Bosnian-locale spreadsheet reads a comma as the decimal mark.
const decimalComma = (value: number) => String(value).replace(".", ",")

/** Downloads the given (already filtered and sorted) projects as a CSV file that opens correctly in Excel. */
export function downloadProjectsCsv(
  projects: HubProjectSummary[],
  leadNameOf: (leadId: string) => string,
  includeMoney: boolean
) {
  const moneyColumn = HEADERS.indexOf(MONEY_HEADER)
  const withoutMoney = <T,>(cells: T[]) => (includeMoney ? cells : cells.filter((_, index) => index !== moneyColumn))

  const rows = projects.map((project) => withoutMoney([
    project.code,
    project.name,
    project.client_name,
    TYPE_LABELS[project.type],
    decimalComma(project.budget),
    STATUS_LABELS[project.status],
    PRIORITY_LABELS[project.priority],
    leadNameOf(project.lead_id),
    formatDate(project.offer_date, ""),
    formatDate(project.agreement_date, ""),
    formatDate(project.start_date, ""),
    formatDate(project.planned_deadline, ""),
    formatDate(project.completion_date, ""),
    formatDate(project.invoice_date, ""),
    project.contract_number,
    `${project.tasks_done}/${project.tasks_total}`,
  ]))

  // The byte-order mark makes Excel treat the file as UTF-8, so č, ć, š, ž, đ survive.
  const blob = new Blob(["﻿" + toCsv(withoutMoney(HEADERS), rows)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `projekti_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
