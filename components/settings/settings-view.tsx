"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RiSettings3Line,
  RiDatabase2Line,
  RiRobot2Line,
  RiMailLine,
  RiSlackLine,
  RiWhatsappLine,
  RiShieldCheckLine,
  RiNotificationLine,
  RiTimeLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiRefreshLine,
} from "@remixicon/react"

interface SettingsViewProps {
  user: {
    name?: string
    email?: string
  }
}

export function SettingsView({ user }: SettingsViewProps) {
  const [testingSlack, setTestingSlack] = React.useState(false)
  const [slackResult, setSlackResult] = React.useState<{ success: boolean; message: string } | null>(null)

  const handleTestSlack = async () => {
    setTestingSlack(true)
    setSlackResult(null)
    try {
      const res = await fetch("/api/test-slack", { method: "POST" })
      const data = await res.json()
      if (res.ok && data.success) {
        setSlackResult({ success: true, message: "Testna notifikacija je uspješno poslana na Slack!" })
      } else {
        setSlackResult({
          success: false,
          message: data.error || "SLACK_WEBHOOK_URL nije konfigurisan ili je nevažeći u .env fajlu.",
        })
      }
    } catch {
      setSlackResult({ success: false, message: "Greška prilikom povezivanja sa serverom." })
    } finally {
      setTestingSlack(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Podešavanja sistema</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pregled integracija, statusa servisa i pravila automatizacije ED Vision Sales platforme.
        </p>
      </div>

      {/* Profil Korisnika */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <RiShieldCheckLine className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Prijavljeni Administrator</h3>
            <p className="text-xs text-muted-foreground">Podaci o trenutnoj aktivnoj sesiji</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground">Ime i prezime</span>
            <p className="text-sm font-semibold text-foreground mt-0.5">{user.name || "Nermin Karić"}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground">Email adresa</span>
            <p className="text-sm font-semibold text-foreground mt-0.5">{user.email || "nermin.karic@ed-vision.com"}</p>
          </div>
        </div>
      </div>

      {/* Status Integracija */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <RiDatabase2Line className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Integracije i vanjski servisi</h3>
              <p className="text-xs text-muted-foreground">Status povezanosti svih ključnih komponenti</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5 text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sve operativno
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Appwrite Cloud Database */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiDatabase2Line className="size-4 text-pink-500" />
                <span className="text-sm font-semibold">Appwrite Baza Podataka</span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[11px]">Povezano</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Kolekcije: <code className="text-foreground">companies</code>, <code className="text-foreground">leads</code>, <code className="text-foreground">contact_logs</code>
            </p>
          </div>

          {/* OpenAI Vision API */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiRobot2Line className="size-4 text-emerald-500" />
                <span className="text-sm font-semibold">OpenAI GPT-4o Vision</span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[11px]">Aktivan</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatska analiza web sajtova, screenshoting i kreiranje personalizovanih emailova.
            </p>
          </div>

          {/* SMTP & IMAP Mail */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiMailLine className="size-4 text-primary" />
                <span className="text-sm font-semibold">SMTP / IMAP Mail Server</span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[11px]">SSL Port 465/993</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Pošiljalac: <span className="font-semibold text-foreground">Edin Fejzić</span> &lt;<span className="font-mono text-foreground">edin.fejzic@ed-vision.net</span>&gt;
            </p>
          </div>

          {/* Slack Webhook */}
          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiSlackLine className="size-4 text-amber-500" />
                <span className="text-sm font-semibold">Slack Webhook Notifikacije</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSlack}
                disabled={testingSlack}
                className="h-7 text-xs gap-1 cursor-pointer"
              >
                {testingSlack ? <RiRefreshLine className="size-3 animate-spin" /> : <RiNotificationLine className="size-3" />}
                Pošalji Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Instant obavještenja o odgovorima klijenata u formatu Block Kit kartica.
            </p>
          </div>
        </div>

        {slackResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
              slackResult.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          >
            {slackResult.success ? <RiCheckLine className="size-4 shrink-0" /> : <RiErrorWarningLine className="size-4 shrink-0" />}
            <span>{slackResult.message}</span>
          </div>
        )}
      </div>

      {/* Pravila Automatizacije */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <RiTimeLine className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Pravila Sales automatizacije</h3>
            <p className="text-xs text-muted-foreground">Raspored i konfiguracija radnih tokova</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/50 gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Jutarnji Outbound Triger (Nove firme)</p>
              <p className="text-xs text-muted-foreground">Svaki dan u 09:00h automatski obrađuje novododane firme, analizira web i šalje ponudu.</p>
            </div>
            <Badge variant="secondary" className="font-mono self-start sm:self-auto">0 9 * * *</Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/50 gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Follow-up Triger & IMAP Provjera</p>
              <p className="text-xs text-muted-foreground">Svaki dan u 10:00h provjerava pristigle odgovore i aktivira WhatsApp podsjetnik za mailove starije od 4 dana.</p>
            </div>
            <Badge variant="secondary" className="font-mono self-start sm:self-auto">0 10 * * *</Badge>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/50 gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Email Warmup Zaštita</p>
              <p className="text-xs text-muted-foreground">Automatska pauza od 5 sekundi između svakog poslanog emaila radi zaštite domene i prevencije spama.</p>
            </div>
            <Badge variant="secondary" className="self-start sm:self-auto">5s Interval</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
