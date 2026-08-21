"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RiQuestionLine,
  RiCompass3Line,
  RiMailSendLine,
  RiWhatsappLine,
  RiSlackLine,
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiCustomerService2Line,
  RiCheckDoubleLine,
  RiSparklingLine,
} from "@remixicon/react"

interface FAQItem {
  question: string
  answer: string
  category: string
}

const FAQS: FAQItem[] = [
  {
    category: "Automatizacija & n8n",
    question: "Kako n8n automatski analizira web stranicu firme?",
    answer:
      "Svakog jutra u 09:00h n8n preuzima novounesene firme iz Appwrite baze. Za svaku firmu koja ima web stranicu, pokreće Google PageSpeed API (provjera performansi i mobilnog prikaza) i prosljeđuje snimak ekrana OpenAI GPT-4o Vision modelu. AI generiše 2-4 konkretne stavke uočenih nedostataka i kreira personalizovanu ponudu.",
  },
  {
    category: "Automatizacija & n8n",
    question: "Kako sistem zna da li je klijent odgovorio na email?",
    answer:
      "U 10:00h n8n se povezuje na vaš IMAP mail server (info@ed-vision.com) i provjerava poruke pristigle u zadnjih 5 dana. Sistem upoređuje pošiljaoce i priznaje odgovor isključivo ako je poruka stigla NAKON datuma slanja ponude (ignorišući stare mailove iz prošlosti). Čim detektuje odgovor, lead se automatski prebacuje u status 'U pregovorima' i šalje se Slack notifikacija.",
  },
  {
    category: "WhatsApp & Follow-up",
    question: "Kada se šalje automatski WhatsApp podsjetnik?",
    answer:
      "Ako klijent ne odgovori na inicijalni email u roku od 4 dana, n8n automatski šalje WhatsApp podsjetnik preko Twilio API-ja na zabilježeni broj telefona firme i evidentira aktivnost u Dnevnik kontakata.",
  },
  {
    category: "Lead Scoring",
    question: "Kako se računa AI Lead Score (0–100 bodova)?",
    answer:
      "Algoritam ocjenjuje leadove prema 4 ključna faktora: veličina firme (do 30 bodova), dostupnost direktnih kanala komunikacije poput telefona i emaila (do 25 bodova), prostor za poboljšanje na webu (do 25 bodova) i trenutna faza u prodajnom lijevku (do 20 bodova). Leadovi sa 75+ bodova označavaju se kao 'Hot Lead' plamenom.",
  },
  {
    category: "Upravljanje Leadovima",
    question: "Kako radi Scrum / Kanban ploča?",
    answer:
      "Na stranici Leadovi možete prebaciti prikaz između tabele i Scrum ploče. Na ploči jednostavno prevlačite kartice firmi kroz faze (Novi ➔ Kontaktiran ➔ Kvalifikovan ➔ U pregovorima ➔ Zaključeno). Promjene se u realnom vremenu spremaju u bazu.",
  },
  {
    category: "Zaštita & Opt-out",
    question: "Kako označiti firmu koja ne želi dalji kontakt?",
    answer:
      "U detaljima leada ili kompanije kliknite na crveno dugme 'Ne kontaktirati' (Blacklist). Lead se momentalno prebacuje u status 'Odbijeno', a n8n workflow je konfigurisan da ga potpuno izuzme iz svih budućih email ili WhatsApp kampanja.",
  },
]

export function HelpView() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0)

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pomoć i podrška</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vodič kroz korištenje ED Vision Sales sistema, automatizovane tokove i najbolje prakse.
        </p>
      </div>

      {/* Brzi Pregled Prodajnog Ciklusa */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <RiCompass3Line className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Kako Funkcioniše Prodajni Ciklus</h3>
            <p className="text-xs text-muted-foreground">Kompletan tok od unosa firme do zaključenog posla</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
            <div className="size-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">1</div>
            <p className="text-sm font-semibold">1. Unos Firme</p>
            <p className="text-xs text-muted-foreground">Ručni unos ili bulk import kompanija sa web stranicom i kontaktima u bazu.</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs font-bold">2</div>
            <p className="text-sm font-semibold">2. AI Analiza & Slanje</p>
            <p className="text-xs text-muted-foreground">U 09:00h AI analizira sajt, piše ponudu i šalje je putem SMTP-a (5s pauza).</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
            <div className="size-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center text-xs font-bold">3</div>
            <p className="text-sm font-semibold">3. IMAP & Follow-up</p>
            <p className="text-xs text-muted-foreground">U 10:00h provjera odgovora. Ako odgovori ➔ Slack alert. Ako ne ➔ WhatsApp poruka nakon 4 dana.</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
            <div className="size-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-bold">4</div>
            <p className="text-sm font-semibold">4. Pregovori & Pobjeda</p>
            <p className="text-xs text-muted-foreground">Kroz Kanban ploču vodite sastanke i prebacujete lead u &apos;Zaključeno - Dobijeno&apos;.</p>
          </div>
        </div>
      </div>

      {/* Često Postavljana Pitanja (FAQ) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <RiQuestionLine className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Često Postavljana Pitanja (FAQ)</h3>
            <p className="text-xs text-muted-foreground">Odgovori na najčešća tehnička i operativna pitanja</p>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="rounded-xl border border-border bg-muted/20 overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-medium text-sm text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                      {faq.category}
                    </Badge>
                    <span className="font-semibold">{faq.question}</span>
                  </div>
                  <RiArrowDownSLine
                    className={`size-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-foreground" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 animate-in fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Kontakt i Podrška */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <RiCustomerService2Line className="size-4" />
            <span>Potrebna vam je dodatna pomoć ili prilagodba?</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Za tehničku asistenciju, podešavanje n8n workflow-a ili dodatna polja u bazi, obratite se direktno ED Vision razvojnom timu.
          </p>
        </div>
        <Button
          asChild
          className="gap-1.5 shrink-0 cursor-pointer shadow-xs"
        >
          <a href="mailto:info@ed-vision.com">
            <RiMailSendLine className="size-4" />
            Kontaktiraj Podršku
          </a>
        </Button>
      </div>
    </div>
  )
}
