import { formatKm } from "@/lib/hub/format"
import type { ClientsOverview } from "./client-stats"

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="block truncate font-mono text-xl font-bold tabular-nums">{value}</span>
      {hint && <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

export function ClientsSummary({ overview }: { overview: ClientsOverview }) {
  const { topClient } = overview

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        label="Ukupno klijenata"
        value={String(overview.totalClients)}
        hint={`${overview.activeClients} aktivnih`}
      />
      <Card
        label="Klijenti s projektima u toku"
        value={String(overview.clientsWithActiveProjects)}
        hint="Barem jedan nezavršen projekat"
      />
      <Card label="Ukupna vrijednost projekata" value={formatKm(overview.totalValue)} hint="Svi povezani projekti" />
      <Card
        label="Najvredniji klijent"
        value={topClient && topClient.value > 0 ? topClient.name : "—"}
        hint={topClient && topClient.value > 0 ? formatKm(topClient.value) : undefined}
      />
    </div>
  )
}
