"use client"

import * as React from "react"
import { RiHashtag, RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getContractCounterAction, setContractCounterAction } from "@/lib/hub/actions/generated-contracts"
import { FormField } from "../projects/form/form-field"

function CounterForm({ onClose }: { onClose: () => void }) {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = React.useState(thisYear)
  const [current, setCurrent] = React.useState<number | null>(null)
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  // The current value is read when the window opens and when another year is picked.
  React.useEffect(() => {
    let cancelled = false
    getContractCounterAction(year).then((result) => {
      if (cancelled) return
      if (!result.success) return setError(result.error)
      setCurrent(result.data.last)
      setValue(String(result.data.last))
    })
    return () => {
      cancelled = true
    }
  }, [year])

  const changeYear = (next: number) => {
    setCurrent(null)
    setError(null)
    setYear(next)
  }

  const entered = Number(value)
  const valid = value.trim() !== "" && Number.isInteger(entered) && current !== null && entered >= current

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid) return setError(`Unesite cijeli broj, najmanje ${current ?? 0}.`)
    setIsSaving(true)
    setError(null)
    const result = await setContractCounterAction(year, entered)
    setIsSaving(false)
    if (!result.success) return setError(result.error)
    toast.success(`Sljedeći ugovor dobija broj ${result.data.last + 1}-${year}.`)
    onClose()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Godina" htmlFor="counter-year">
          <Select value={String(year)} onValueChange={(next) => changeYear(Number(next))}>
            <SelectTrigger id="counter-year" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[thisYear, thisYear + 1].map((item) => (
                <SelectItem key={item} value={String(item)}>
                  {item}.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Zadnji iskorišteni broj" htmlFor="counter-value">
          <Input
            id="counter-value"
            type="number"
            inputMode="numeric"
            min={current ?? 0}
            step={1}
            value={value}
            disabled={current === null}
            onChange={(event) => setValue(event.target.value)}
          />
        </FormField>
      </div>

      <p className="text-xs text-muted-foreground">
        {current === null ? (
          "Učitavanje..."
        ) : (
          <>
            Trenutno: {current === 0 ? "nijedan broj nije iskorišten" : `zadnji je ${current}-${year}`}. Sljedeći ugovor dobija{" "}
            <span className="font-mono font-semibold text-foreground">{(valid ? entered : current) + 1}-{year}</span>. Broj se može
            samo povećati, nikad smanjiti, da se iskorišteni brojevi ne ponove.
          </>
        )}
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="cursor-pointer">
          Odustani
        </Button>
        <Button type="submit" size="sm" disabled={!valid || isSaving || entered === current} className="cursor-pointer gap-1.5">
          {isSaving && <RiLoader4Line className="size-4 animate-spin" />}
          Sačuvaj
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Admin only: lets numbering continue after contracts numbered outside the app. */
export function CounterSettings() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="cursor-pointer gap-1.5">
        <RiHashtag className="size-4" />
        Postavke brojača
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Postavke brojača ugovora</DialogTitle>
            <DialogDescription>
              Upišite zadnji broj koji ste već iskoristili (npr. za ugovore napravljene van aplikacije).
            </DialogDescription>
          </DialogHeader>
          {open && <CounterForm onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
