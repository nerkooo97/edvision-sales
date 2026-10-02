"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RiAddLine, RiBankCardLine, RiDeleteBinLine, RiEditLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { formatKm } from "@/lib/hub/format"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  formatSubscriptionPrice,
  currencyOf,
  toKm,
} from "@/lib/hub/subscriptions"
import type { HubMember, HubSubscription } from "@/lib/hub/types"
import { formatDate } from "@/lib/utils"
import { DeleteSubscriptionDialog } from "./delete-subscription-dialog"
import { SubscriptionDialog } from "./subscription-dialog"
import { SubscriptionsSummary } from "./subscriptions-summary"

/** The price as paid, with its worth in KM underneath when the currency is not KM. */
function PriceCell({ subscription }: { subscription: HubSubscription }) {
  const currency = currencyOf(subscription.currency)

  return (
    <>
      <span>{formatSubscriptionPrice(subscription.price, currency)}</span>
      {currency !== "KM" && (
        <span className="block text-[11px] text-muted-foreground">≈ {formatKm(toKm(subscription.price, currency))}</span>
      )}
    </>
  )
}

interface SubscriptionsListProps {
  subscriptions: HubSubscription[]
  holders: Pick<HubMember, "id" | "name">[]
  /** Admin and finance may add, edit and delete; everyone else only looks. */
  canManage: boolean
}

export function SubscriptionsList({ subscriptions, holders, canManage }: SubscriptionsListProps) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<HubSubscription | null>(null)
  const [toDelete, setToDelete] = React.useState<HubSubscription | null>(null)

  const holderNames = React.useMemo(() => new Map(holders.map((holder) => [holder.id, holder.name])), [holders])

  const openDialog = (subscription: HubSubscription | null) => {
    setEditing(subscription)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <SubscriptionsSummary subscriptions={subscriptions} />

      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => openDialog(null)} className="cursor-pointer gap-1.5 shadow-xs">
            <RiAddLine className="size-4" />
            Nova pretplata
          </Button>
        </div>
      )}

      {subscriptions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          <RiBankCardLine className="size-8 opacity-40" />
          <p className="text-sm font-medium text-foreground">Još nema pretplata</p>
          {canManage && <p className="text-xs">Kliknite na &apos;Nova pretplata&apos; za unos prve.</p>}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naziv pretplate</TableHead>
                <TableHead>Datum plaćanja</TableHead>
                <TableHead>Ime na koga je pretplata</TableHead>
                <TableHead className="text-right">Cijena</TableHead>
                {canManage && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.$id}>
                  <TableCell className="font-medium">{subscription.name}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatDate(subscription.payment_date)}
                  </TableCell>
                  <TableCell>{holderNames.get(subscription.holder_id) ?? "Nepoznat korisnik"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <PriceCell subscription={subscription} />
                  </TableCell>
                  {canManage && (
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 cursor-pointer text-muted-foreground hover:text-primary"
                        title="Uredi pretplatu"
                        onClick={() => openDialog(subscription)}
                      >
                        <RiEditLine className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                        title="Obriši pretplatu"
                        onClick={() => setToDelete(subscription)}
                      >
                        <RiDeleteBinLine className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SubscriptionDialog open={dialogOpen} onOpenChange={setDialogOpen} subscription={editing} holders={holders} onSaved={refresh} />
      <DeleteSubscriptionDialog
        subscription={toDelete}
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        onDeleted={refresh}
      />
    </div>
  )
}
