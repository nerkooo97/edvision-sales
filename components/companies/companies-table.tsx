"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { Company } from "@/lib/appwrite/companies"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CompanySheet } from "./company-sheet"
import { DeleteCompanyDialog } from "./delete-company-dialog"
import {
  RiSearchLine,
  RiBuilding2Line,
  RiGlobalLine,
  RiMailLine,
  RiPhoneLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiExternalLinkLine,
  RiUserLine,
  RiMapPinLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiEyeLine,
} from "@remixicon/react"

interface CompaniesTableProps {
  companies: Company[]
  total: number
  page: number
  limit: number
  totalPages: number
  search: string
}

export function CompaniesTable({
  companies,
  total,
  page,
  limit,
  totalPages,
  search: initialSearch,
}: CompaniesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchValue, setSearchValue] = React.useState(initialSearch)
  const [isPending, startTransition] = React.useTransition()

  // Sheet & Dialog State
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [sheetMode, setSheetMode] = React.useState<"create" | "edit" | "view">("create")
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [companyToDelete, setCompanyToDelete] = React.useState<Company | null>(null)

  // Update URL search parameters
  const updateQuery = React.useCallback(
    (newParams: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      })

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [pathname, router, searchParams]
  )

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== initialSearch) {
        updateQuery({ search: searchValue, page: 1 })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchValue, initialSearch, updateQuery])

  const openCreateSheet = () => {
    setSelectedCompany(null)
    setSheetMode("create")
    setSheetOpen(true)
  }

  const openViewSheet = (company: Company) => {
    setSelectedCompany(company)
    setSheetMode("view")
    setSheetOpen(true)
  }

  const openEditSheet = (company: Company) => {
    setSelectedCompany(company)
    setSheetMode("edit")
    setSheetOpen(true)
  }

  const openDeleteDialog = (company: Company) => {
    setCompanyToDelete(company)
    setDeleteDialogOpen(true)
  }

  const handleActionSuccess = () => {
    router.refresh()
  }

  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      {/* Search Bar & Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Pretraži po nazivu firme..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="text-xs text-muted-foreground">
            Ukupno: <span className="font-medium text-foreground">{total}</span> firmi
          </div>

          <Button
            size="sm"
            onClick={openCreateSheet}
            className="gap-1.5 cursor-pointer shadow-xs"
          >
            <RiAddLine className="size-4" />
            <span>Dodaj firmu</span>
          </Button>
        </div>
      </div>

      {/* Table Container with Internal Horizontal Scroll */}
      <div className="rounded-xl border border-border bg-card overflow-hidden w-full max-w-full">
        <Table className="min-w-[1000px] w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40">
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[200px]">Kompanija</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[160px]">Grad & Adresa</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[160px]">Djelatnost</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[180px]">Kontakt</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[130px]">Web</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[140px]">Vlasnik</TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right min-w-[110px]">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <RiBuilding2Line className="size-8 opacity-40" />
                    <p className="font-medium text-sm text-foreground">Nema pronađenih firmi</p>
                    <p className="text-xs">
                      {searchValue ? "Pokušajte sa drugačijim pojmom za pretragu." : "Kliknite na 'Dodaj firmu' za unos prve kompanije."}
                    </p>
                    {!searchValue && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openCreateSheet}
                        className="mt-2 gap-1.5 cursor-pointer"
                      >
                        <RiAddLine className="size-4" />
                        Dodaj firmu
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow
                  key={company.$id}
                  className="hover:bg-muted/40 transition-colors group cursor-pointer"
                  onClick={() => openViewSheet(company)}
                >
                  {/* Company Name & JIB */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                        {company.company_name}
                      </span>
                      {company.tax_id && (
                        <span className="text-xs text-muted-foreground font-mono">
                          JIB: {company.tax_id}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* City & Address */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {company.city ? (
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <RiMapPinLine className="size-3 text-muted-foreground shrink-0" />
                          <span>{company.city}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                      {company.address && (
                        <span className="text-xs truncate max-w-[180px]">
                          {company.address}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Industry & Size */}
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      {company.industry ? (
                        <span className="text-xs font-medium text-foreground">
                          {company.industry}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">—</span>
                      )}
                      {company.company_size && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                          {company.company_size}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Contact */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1 text-xs">
                      {company.email ? (
                        <a
                          href={`mailto:${company.email}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <RiMailLine className="size-3 shrink-0" />
                          <span className="truncate max-w-[160px]">{company.email}</span>
                        </a>
                      ) : null}

                      {company.phones && company.phones.length > 0 ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <RiPhoneLine className="size-3 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {company.phones.join(", ")}
                          </span>
                        </div>
                      ) : null}

                      {!company.email && (!company.phones || company.phones.length === 0) && (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Website */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {company.website ? (
                      <a
                        href={
                          company.website.startsWith("http")
                            ? company.website
                            : `https://${company.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <RiGlobalLine className="size-3.5 shrink-0" />
                        <span className="truncate max-w-[120px]">
                          {company.website.replace(/^https?:\/\//, "")}
                        </span>
                        <RiExternalLinkLine className="size-3 opacity-70 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/60 text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Owner */}
                  <TableCell>
                    {company.owner_name ? (
                      <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                        <RiUserLine className="size-3 text-muted-foreground shrink-0" />
                        <span>{company.owner_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60 text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Pregledaj detalje"
                        onClick={() => openViewSheet(company)}
                      >
                        <RiEyeLine className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-primary cursor-pointer"
                        title="Uredi firmu"
                        onClick={() => openEditSheet(company)}
                      >
                        <RiEditLine className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Obriši firmu"
                        onClick={() => openDeleteDialog(company)}
                      >
                        <RiDeleteBinLine className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <div>
            Prikazano <span className="font-medium text-foreground">{startIndex}</span>–
            <span className="font-medium text-foreground">{endIndex}</span> od{" "}
            <span className="font-medium text-foreground">{total}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs">
              Stranica <span className="font-medium text-foreground">{page}</span> od{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer"
                disabled={page <= 1 || isPending}
                onClick={() => updateQuery({ page: page - 1 })}
                aria-label="Prethodna stranica"
              >
                <RiArrowLeftSLine className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer"
                disabled={page >= totalPages || isPending}
                onClick={() => updateQuery({ page: page + 1 })}
                aria-label="Sljedeća stranica"
              >
                <RiArrowRightSLine className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Sheet (Create, Edit, View) */}
      <CompanySheet
        company={selectedCompany}
        mode={sheetMode}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleActionSuccess}
        onSwitchToEdit={() => setSheetMode("edit")}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteCompanyDialog
        company={companyToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleActionSuccess}
      />
    </div>
  )
}
