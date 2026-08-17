"use client"

import { useActionState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginAction, type AuthActionResult } from "@/lib/appwrite/actions"
import { RiLoader4Line } from "@remixicon/react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    loginAction,
    null
  )

  return (
    <form action={formAction} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Prijava na sistem</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Unesite vaš email i lozinku za pristup prodajnom sistemu
          </p>
        </div>

        {state?.error && (
          <FieldError>{state.error}</FieldError>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email adresa</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="ime@ed-vision.com"
            autoComplete="email"
            required
            disabled={isPending}
            className="bg-background"
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Lozinka</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground"
            >
              Zaboravili ste lozinku?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={isPending}
            className="bg-background"
          />
        </Field>
        <Field>
          <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <RiLoader4Line className="h-4 w-4 animate-spin" />
                Prijava u toku...
              </span>
            ) : (
              "Prijavi se"
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
