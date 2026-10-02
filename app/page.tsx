import { getLoggedInUser } from "@/lib/appwrite/server"
import { LoginForm } from "@/components/login-form"
import { redirect } from "next/navigation"
import Image from "next/image"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Prijava | Edvision Hub",
  description: "Prijavite se na Edvision Hub",
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
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Edvision Hub</span>
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
        <div className="relative z-10 flex items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-medium text-zinc-300 backdrop-blur-md shadow-inner">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span>Edvision Hub</span>
          </div>
        </div>

        {/* Glavni sadržaj: opšta predstava firme, namjerno bez ikakvih podataka o sistemu jer je stranica javna */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
              Digitalna rješenja{" "}
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                za vaš posao.
              </span>
            </h2>
            <p className="text-sm xl:text-base text-zinc-400 leading-relaxed">
              Web stranice, online shopovi i digitalizacija poslovanja, na jednom mjestu.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["Web", "Shop", "Digitalizacija"].map((label) => (
              <span
                key={label}
                className="px-3 py-1 rounded-full bg-zinc-900/70 border border-zinc-800 text-xs font-medium text-zinc-300 backdrop-blur-md"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Footer desne strane */}
        <div className="relative z-10 pt-6 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
          <span>ed-vision.com</span>
          <span className="text-zinc-600">ED Vision d.o.o.</span>
        </div>
      </div>
    </div>
  )
}
