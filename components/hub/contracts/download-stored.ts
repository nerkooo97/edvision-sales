"use client"

import { toast } from "sonner"
import { getGeneratedContractAction } from "@/lib/hub/actions/generated-contracts"
import { downloadContractPdf } from "@/lib/hub/contracts/pdf/download"

/** Builds the PDF of a saved contract again from its stored form and downloads it. Nothing is stored. */
export async function downloadStoredContract(contractId: string): Promise<void> {
  const result = await getGeneratedContractAction(contractId)
  if (!result.success) {
    toast.error(result.error)
    return
  }
  try {
    await downloadContractPdf(result.data.template, result.data.values)
  } catch (error) {
    console.error("Contract PDF failed:", error)
    toast.error("Generisanje PDF-a nije uspjelo. Pokušajte ponovo.")
  }
}
