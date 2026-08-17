"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  createCompany,
  updateCompany,
  type Company,
  type CompanyInput,
} from "@/lib/appwrite/companies"
import {
  RiBuilding2Line,
  RiGlobalLine,
  RiMailLine,
  RiPhoneLine,
  RiAddLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiEditLine,
  RiExternalLinkLine,
  RiPriceTag3Line,
  RiWhatsappLine,
} from "@remixicon/react"
import { getWhatsAppLink } from "@/lib/scoring"

interface CompanySheetProps {
  company: Company | null
  mode: "create" | "edit" | "view"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onSwitchToEdit?: () => void
}

function CompanyFormBody({
  company,
  mode,
  onClose,
  onSuccess,
  onSwitchToEdit,
}: {
  company: Company | null
  mode: "create" | "edit" | "view"
  onClose: () => void
  onSuccess?: () => void
  onSwitchToEdit?: () => void
}) {
  const [formData, setFormData] = React.useState<CompanyInput>(() => {
    if (company && (mode === "edit" || mode === "view")) {
      return {
        company_name: company.company_name || "",
        city: company.city || "",
        address: company.address || "",
        website: company.website || "",
        email: company.email || "",
        phones: company.phones && company.phones.length > 0 ? [...company.phones] : [""],
        tax_id: company.tax_id || "",
        owner_name: company.owner_name || "",
        industry: company.industry || "",
        company_size: company.company_size || "",
        source: company.source || "",
      }
    }
    return {
      company_name: "",
      city: "",
      address: "",
      website: "",
      email: "",
      phones: [""],
      tax_id: "",
      owner_name: "",
      industry: "",
      company_size: "",
      source: "",
    }
  })

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handlePhoneChange = (index: number, value: string) => {
    const updated = [...(formData.phones || [])]
    updated[index] = value
    setFormData({ ...formData, phones: updated })
  }

  const addPhoneField = () => {
    setFormData({ ...formData, phones: [...(formData.phones || []), ""] })
  }

  const removePhoneField = (index: number) => {
    const updated = (formData.phones || []).filter((_, i) => i !== index)
    setFormData({ ...formData, phones: updated.length > 0 ? updated : [""] })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.company_name.trim()) {
      setError("Naziv firme je obavezan.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const cleanedPhones = (formData.phones || []).map((p) => p.trim()).filter(Boolean)
    const payload: CompanyInput = {
      ...formData,
      phones: cleanedPhones,
    }

    let result
    if (mode === "create") {
      result = await createCompany(payload)
    } else if (mode === "edit" && company) {
      result = await updateCompany(company.$id, payload)
    }

    setIsSubmitting(false)

    if (result && result.success) {
      onClose()
      onSuccess?.()
    } else if (result) {
      setError(result.error || "Došlo je do greške.")
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {error && (
          <div className="p-3.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in">
            {error}
          </div>
        )}

        {mode === "view" && company ? (
          /* VIEW MODE DETAILS */
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{company.company_name}</h3>
                  {company.tax_id && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      JIB: {company.tax_id}
                    </p>
                  )}
                </div>
                {company.company_size && (
                  <Badge variant="secondary" className="text-xs">
                    {company.company_size}
                  </Badge>
                )}
              </div>

              {company.industry && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RiPriceTag3Line className="size-3.5" />
                  <span>{company.industry}</span>
                </div>
              )}
            </div>

            {/* Location & Address */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lokacija
              </h4>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Grad</span>
                  <span className="text-sm font-medium text-foreground">
                    {company.city || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Adresa</span>
                  <span className="text-sm font-medium text-foreground truncate block">
                    {company.address || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kontakt podaci
              </h4>
              <div className="space-y-2.5 p-3.5 rounded-xl border border-border bg-card text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <RiMailLine className="size-3.5" /> Email:
                  </span>
                  {company.email ? (
                    <a href={`mailto:${company.email}`} className="font-medium text-primary hover:underline">
                      {company.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <RiGlobalLine className="size-3.5" /> Web stranica:
                  </span>
                  {company.website ? (
                    <a
                      href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {company.website.replace(/^https?:\/\//, "")}
                      <RiExternalLinkLine className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </div>

                <Separator />

                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5 pt-0.5">
                    <RiPhoneLine className="size-3.5" /> Telefoni:
                  </span>
                  <div className="flex flex-col items-end gap-1.5 max-w-[280px]">
                    {company.phones && company.phones.length > 0 ? (
                      company.phones.map((phone, idx) => {
                        const whatsappUrl = getWhatsAppLink(phone, company.company_name)
                        return (
                          <div key={idx} className="flex items-center gap-1.5">
                            <a
                              href={`tel:${phone}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-background hover:bg-muted text-[11px] font-mono text-foreground"
                            >
                              <RiPhoneLine className="size-3 text-emerald-500" />
                              {phone}
                            </a>
                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 text-[10px] font-medium"
                                title="Pošalji WhatsApp"
                              >
                                <RiWhatsappLine className="size-3" /> WA
                              </a>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Owner & Source */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dodatni detalji
              </h4>
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-card text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Vlasnik</span>
                  <span className="text-sm font-medium text-foreground">
                    {company.owner_name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Izvor</span>
                  <span className="text-sm font-medium text-foreground">
                    {company.source || "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CREATE / EDIT FORM */
          <form id="company-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Naziv Firme & JIB */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="company_name" className="text-xs font-semibold">
                  Naziv firme <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company_name"
                  required
                  placeholder="npr. EdVision d.o.o."
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tax_id" className="text-xs font-semibold">
                  JIB (Identifikacioni broj)
                </Label>
                <Input
                  id="tax_id"
                  placeholder="npr. 4200000000000"
                  value={formData.tax_id || ""}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="owner_name" className="text-xs font-semibold">
                  Vlasnik (Ime i prezime)
                </Label>
                <Input
                  id="owner_name"
                  placeholder="npr. Nermin Karić"
                  value={formData.owner_name || ""}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Lokacija */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-semibold">
                  Grad
                </Label>
                <Input
                  id="city"
                  placeholder="npr. Sarajevo"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold">
                  Adresa
                </Label>
                <Input
                  id="address"
                  placeholder="npr. Maršala Tita 10"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Djelatnost & Veličina */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="industry" className="text-xs font-semibold">
                  Djelatnost
                </Label>
                <Input
                  id="industry"
                  placeholder="npr. IT, Trgovina, Proizvodnja..."
                  value={formData.industry || ""}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company_size" className="text-xs font-semibold">
                  Veličina kompanije
                </Label>
                <Input
                  id="company_size"
                  placeholder="npr. 1-10, 11-50, 50+ radnika"
                  value={formData.company_size || ""}
                  onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Kontakt podaci */}
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email adresa
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@firma.ba"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website" className="text-xs font-semibold">
                    Web stranica
                  </Label>
                  <Input
                    id="website"
                    placeholder="www.firma.ba"
                    value={formData.website || ""}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>

              {/* Telefoni (Array) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Telefonski brojevi</Label>
                  <button
                    type="button"
                    onClick={addPhoneField}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RiAddLine className="size-3.5" /> Dodaj broj
                  </button>
                </div>

                <div className="space-y-2">
                  {(formData.phones || []).map((phone, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="+387 61 000 000"
                        value={phone}
                        onChange={(e) => handlePhoneChange(idx, e.target.value)}
                      />
                      {(formData.phones || []).length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => removePhoneField(idx)}
                        >
                          <RiDeleteBinLine className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Izvor */}
            <div className="space-y-1.5">
              <Label htmlFor="source" className="text-xs font-semibold">
                Izvor podatka
              </Label>
              <Input
                id="source"
                placeholder="npr. n8n scraper, Ručni unos, Web..."
                value={formData.source || ""}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              />
            </div>
          </form>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
        {mode === "view" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="cursor-pointer"
            >
              Zatvori
            </Button>
            <Button
              size="sm"
              onClick={onSwitchToEdit}
              className="gap-1.5 cursor-pointer"
            >
              <RiEditLine className="size-4" />
              Uredi firmu
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="cursor-pointer"
            >
              Odustani
            </Button>
            <Button
              form="company-form"
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RiLoader4Line className="size-4 animate-spin" />
                  Čuvanje...
                </>
              ) : mode === "create" ? (
                "Kreiraj firmu"
              ) : (
                "Sačuvaj izmjene"
              )}
            </Button>
          </>
        )}
      </div>
    </>
  )
}

export function CompanySheet({
  company,
  mode,
  open,
  onOpenChange,
  onSuccess,
  onSwitchToEdit,
}: CompanySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl flex flex-col h-full p-0 bg-card border-l border-border overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <RiBuilding2Line className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold">
                {mode === "create"
                  ? "Dodaj novu firmu"
                  : mode === "edit"
                  ? "Uredi podatke firme"
                  : company?.company_name || "Detalji firme"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {mode === "create"
                  ? "Unesite osnovne i kontakt podatke za novu kompaniju"
                  : mode === "edit"
                  ? "Izmijenite željena polja i sačuvajte promjene"
                  : "Pregled svih registrovanih informacija o kompaniji"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {open && (
          <CompanyFormBody
            key={`${company?.$id || "new"}-${mode}`}
            company={company}
            mode={mode}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
            onSwitchToEdit={onSwitchToEdit}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
