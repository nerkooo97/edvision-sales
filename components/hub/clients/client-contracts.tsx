"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { RiDeleteBinLine, RiDownload2Line, RiFileTextLine, RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteGeneratedContractAction } from "@/lib/hub/actions/generated-contracts"
import { getContractTemplate } from "@/lib/hub/contracts/templates"
import { CONTRACT_TEMPLATE_IDS, type ContractTemplateId } from "@/lib/hub/contracts/types"
import { formatPeriod } from "@/lib/hub/maintenance"
import type { GeneratedContractSummary } from "@/lib/hub/types"
import { formatDate } from "@/lib/utils"
import { downloadStoredContract } from "../contracts/download-stored"

interface ClientContractsProps {
  contracts: GeneratedContractSummary[]
  /** Admins may delete a contract made by mistake. */
  canDelete: boolean
}

const templateTitle = (id: string) =>
  (CONTRACT_TEMPLATE_IDS as readonly string[]).includes(id) ? getContractTemplate(id as ContractTemplateId).title : id

/** Contracts made with the generator; the PDF is built again on download, nothing is stored as a file. */
export function ClientContracts({ contracts, canDelete }: ClientContractsProps) {
  const router = useRouter()
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const download = async (id: string) => {
    setBusyId(id)
    await downloadStoredContract(id)
    setBusyId(null)
  }

  const remove = async (contract: GeneratedContractSummary) => {
    if (!window.confirm(`Obrisati ugovor ${contract.contract_number}? Broj se neće ponovo koristiti.`)) return
    setBusyId(contract.$id)
    const result = await deleteGeneratedContractAction(contract.$id)
    setBusyId(null)
    if (!result.success) return toast.error(result.error)
    toast.success("Ugovor je obrisan.")
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Ugovori</h3>
        <Link href="/hub/contracts/generator" className="text-xs text-primary hover:underline">
          Novi ugovor u generatoru
        </Link>
      </div>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
          <RiFileTextLine className="size-6 opacity-40" />
          <p className="text-sm">Za ovog klijenta još nema ugovora iz generatora.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Broj</TableHead>
                <TableHead>Vrsta</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Zaključen</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.$id}>
                  <TableCell className="font-mono text-xs font-semibold">{contract.contract_number}</TableCell>
                  <TableCell className="text-sm">{templateTitle(contract.template)}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {formatPeriod(contract.start_date, contract.end_date)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(contract.concluded_date)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 cursor-pointer text-muted-foreground hover:text-primary"
                        title="Preuzmi PDF"
                        disabled={busyId === contract.$id}
                        onClick={() => download(contract.$id)}
                      >
                        {busyId === contract.$id ? <RiLoader4Line className="size-4 animate-spin" /> : <RiDownload2Line className="size-4" />}
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                          title="Obriši ugovor"
                          disabled={busyId === contract.$id}
                          onClick={() => remove(contract)}
                        >
                          <RiDeleteBinLine className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
