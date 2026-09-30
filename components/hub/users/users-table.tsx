"use client"

import * as React from "react"
import { RiLoader4Line } from "@remixicon/react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { assignRoleAction } from "@/lib/hub/actions/users"
import { ROLE_DESCRIPTIONS, ROLE_DISPLAY_NAMES } from "@/lib/hub/labels"
import { HUB_ROLES, type HubRole } from "@/lib/hub/roles"
import type { HubMember } from "@/lib/hub/types"

const NO_ACCESS = "none"

interface UsersTableProps {
  users: HubMember[]
  currentUserId: string
}

function RoleSelect({
  user,
  isSelf,
  onChanged,
}: {
  user: HubMember
  isSelf: boolean
  onChanged: (userId: string, role: HubRole | null) => void
}) {
  const [isPending, startTransition] = React.useTransition()

  const change = (value: string) => {
    const role = value === NO_ACCESS ? null : (value as HubRole)
    startTransition(async () => {
      const result = await assignRoleAction(user.id, role)
      if (result.success) {
        onChanged(user.id, role)
        toast.success(role ? `${user.name}: ${ROLE_DISPLAY_NAMES[role]}` : `${user.name}: pristup uklonjen`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={user.role ?? NO_ACCESS} onValueChange={change} disabled={isPending || isSelf}>
        <SelectTrigger size="sm" className="h-8 w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_ACCESS}>Bez pristupa</SelectItem>
          {HUB_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_DISPLAY_NAMES[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <RiLoader4Line className="size-4 animate-spin text-muted-foreground" />}
      {isSelf && <span className="text-xs text-muted-foreground">Vaš račun</span>}
    </div>
  )
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  // Roles changed here are shown at once; the server is the source of truth on the next load.
  const [roleOverrides, setRoleOverrides] = React.useState<Record<string, HubRole | null>>({})

  const rows = users.map((user) => (user.id in roleOverrides ? { ...user, role: roleOverrides[user.id] } : user))

  return (
    <div className="space-y-6">
      <div className="w-full max-w-full overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-transparent">
              <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Korisnik
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Uloga</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleSelect
                    user={user}
                    isSelf={user.id === currentUserId}
                    onChanged={(userId, role) => setRoleOverrides((current) => ({ ...current, [userId]: role }))}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Šta koja uloga smije</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          {HUB_ROLES.map((role) => (
            <div key={role}>
              <dt className="text-sm font-medium">{ROLE_DISPLAY_NAMES[role]}</dt>
              <dd className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
