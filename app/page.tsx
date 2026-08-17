import { getLoggedInUser } from "@/lib/appwrite/server"
import { LoginForm } from "@/components/login-form"
import { redirect } from "next/navigation"
import { RiGalleryLine } from "@remixicon/react"
import Image from "next/image"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Prijava | EdVision Sales",
  description: "Prijavite se na vaš nalog",
}

export default async function LoginPage() {
  const user = await getLoggedInUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <RiGalleryLine className="size-4" />
            </div>
            EdVision Sales
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/placeholder.svg"
          alt="Image"
          fill
          priority
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
