import { getLoggedInUser } from "@/lib/appwrite/server"
import { LoginForm } from "@/components/login-form"
import { redirect } from "next/navigation"
import Image from "next/image"
import type { Metadata } from "next"
import {
  RiSparklingFill,
  RiMailSendLine,
  RiWhatsappLine,
  RiShieldCheckLine,
  RiFlashlightLine,
  RiCheckboxCircleFill,
  RiGlobalLine,
} from "@remixicon/react"

export const metadata: Metadata = {
  title: "Prijava | Edvision Sales",
  description: "Prijavite se na vaš prodajni sistem",
}

export default async function LoginPage() {
  const user = await getLoggedInUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background">
      {/* Lijeva strana: Forma za prijavu */}
      <div className="flex flex-col justify-between p-6 md:p-12 lg:p-16">
        <div className="flex justify-center md:justify-start">
          <a href="#" className="flex items-center gap-3 font-bold text-lg tracking-tight">
            <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 p-1.5 shadow-sm">
              <Image
                src="/logo-part.png"
                alt="Edvision Logo"
                width={36}
                height={36}
                className="w-auto h-7 object-contain"
                priority
              />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Edvision Sales</span>
          </a>
        </div>

        <div className="flex items-center justify-center my-auto py-10">
          <div className="w-full max-w-sm space-y-6">
            <LoginForm />
          </div>
        </div>

        <div className="text-center md:text-left text-xs text-muted-foreground">
          © {new Date().getFullYear()} ED Vision d.o.o. Sva prava zadržana.
        </div>
      </div>

      {/* Desna strana: Moderni Showcase Panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-zinc-950 text-white overflow-hidden border-l border-zinc-800/60">
        {/* Pozadinski ambient sjaj (Ambient Glow Effects) */}
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-24 size-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 size-96 rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />

        {/* Suptilna pozadinska mreža sa tačkicama */}
        <div 
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Suptilni Logo Watermark u pozadini */}
        <div className="absolute -bottom-20 -right-20 size-[420px] xl:size-[500px] opacity-[0.04] select-none pointer-events-none rotate-[-10deg] grayscale brightness-150">
          <Image
            src="/logo-part.png"
            alt="ED Vision Watermark"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Header desne strane */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-medium text-zinc-300 backdrop-blur-md shadow-inner">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI Outbound & Sales Engine</span>
          </div>

          <span className="text-xs text-zinc-500 font-mono tracking-wider">v2.4 Pro</span>
        </div>

        {/* Glavni sadržaj i Glassmorphism kartice */}
        <div className="relative z-10 my-auto space-y-8 max-w-lg">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
              Automatizujte B2B prodaju.{" "}
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                Fokusirajte se na rast.
              </span>
            </h2>
            <p className="text-sm xl:text-base text-zinc-400 leading-relaxed">
              Kompletan ekosistem za pronalazak kompanija, inteligentnu analizu, slanje personalizovanih ponuda i praćenje konverzija.
            </p>
          </div>

          {/* Glavna Glass kartica 1: AI Pipeline Snapshot */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl shadow-2xl space-y-4 transition-all hover:border-orange-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <RiSparklingFill className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">GPT-4o Vision & Outreach</h4>
                  <p className="text-[11px] text-zinc-500">44 ciklusa dnevno • Svakih 15 min</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                <RiCheckboxCircleFill className="size-3" /> Aktivan
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex items-center gap-2">
                <RiGlobalLine className="size-4 text-orange-400 shrink-0" />
                <span className="text-zinc-300 font-medium truncate">Web i Shop rješenja</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/50 flex items-center gap-2">
                <RiFlashlightLine className="size-4 text-amber-400 shrink-0" />
                <span className="text-zinc-300 font-medium truncate">Digitalizacija procesa</span>
              </div>
            </div>
          </div>

          {/* Kartica 2: Tri ključne snage sistema */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
              <RiShieldCheckLine className="size-4 text-emerald-400 mx-auto mb-1.5" />
              <div className="text-xs font-bold text-zinc-200">10/10</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Deliverability</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
              <RiMailSendLine className="size-4 text-orange-400 mx-auto mb-1.5" />
              <div className="text-xs font-bold text-zinc-200">IMAP Sync</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Praćenje odgovora</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
              <RiWhatsappLine className="size-4 text-emerald-400 mx-auto mb-1.5" />
              <div className="text-xs font-bold text-zinc-200">OpenWA</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Follow-up podsjetnik</div>
            </div>
          </div>
        </div>

        {/* Footer desne strane */}
        <div className="relative z-10 pt-6 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
          <span>ED Vision Sales Hub</span>
          <span className="text-zinc-600">Sigurna i enkriptovana veza</span>
        </div>
      </div>
    </div>
  )
}
