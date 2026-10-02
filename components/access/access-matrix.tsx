"use client"

import * as React from "react"
import { RiAlertLine, RiLoader4Line, RiShieldStarLine } from "@remixicon/react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { setModuleRoleAction } from "@/lib/access/actions/access"
import { MODULES, MODULE_IDS, type ModuleId } from "@/lib/access/modules"
import type { AccessUser } from "@/lib/access/server/users"

const NO_ACCESS = "none"

interface AccessMatrixProps {
  users: AccessUser[]
  /** Whether Sales roles are switched on; when off, the Sales column does not restrict anything yet. */
  salesEnforced: boolean
}

function RoleCell({
  user,
  moduleId,
  role,
  onChanged,
}: {
  user: AccessUser
  moduleId: ModuleId
  role: string | null
  onChanged: (userId: string, moduleId: ModuleId, role: string | null) => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const definition = MODULES[moduleId]

  const change = (value: string) => {
    const next = value === NO_ACCESS ? null : value
    startTransition(async () => {
      const result = await setModuleRoleAction(user.id, moduleId, next)
      if (result.success) {
        onChanged(user.id, moduleId, next)
        toast.success(`${user.name} · ${definition.name}: ${next ? definition.roleNames[next] : "bez pristupa"}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={role ?? NO_ACCESS} onValueChange={change} disabled={isPending}>
        <SelectTrigger size="sm" className="h-8 w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_ACCESS}>Bez pristupa</SelectItem>
          {definition.roles.map((option) => (
            <SelectItem key={option} value={option}>
              {definition.roleNames[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <RiLoader4Line className="size-4 animate-spin text-muted-foreground" />}
    </div>
  )
}

export function AccessMatrix({ users, salesEnforced }: AccessMatrixProps) {
  // A change shows at once; the server is the source of truth on the next load.
  const [overrides, setOverrides] = React.useState<Record<string, Partial<Record<ModuleId, string | null>>>>({})

  const roleOf = (user: AccessUser, moduleId: ModuleId) =>
    overrides[user.id] && moduleId in overrides[user.id] ? overrides[user.id][moduleId]! ?? null : user.roles[moduleId]

  const handleChanged = (userId: string, moduleId: ModuleId, role: string | null) =>
    setOverrides((current) => ({ ...current, [userId]: { ...current[userId], [moduleId]: role } }))

  return (
    <div className="space-y-6">
      {!salesEnforced && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <RiAlertLine className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p>
            <strong>Uloge za Sales se još ne primjenjuju.</strong> Dok je prekidač <code className="font-mono">SALES_ROLES_ENFORCED</code>{" "}
            isključen, svi prijavljeni korisnici imaju pun pristup salesu, kao i do sada. Dodijelite uloge svima kojima treba
            Sales, pa tek onda uključite prekidač, da niko ne ostane bez pristupa. Uloge za Projekte se primjenjuju odmah.
          </p>
        </div>
      )}

      <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border bg-card">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-transparent">
              <TableHead className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Korisnik</TableHead>
              {MODULE_IDS.map((id) => (
                <TableHead key={id} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {MODULES[id].name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </TableCell>

                {user.isOrgAdmin ? (
                  <TableCell colSpan={MODULE_IDS.length}>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      <RiShieldStarLine className="size-4" />
                      Glavni administrator: pun pristup svim modulima
                    </span>
                  </TableCell>
                ) : (
                  MODULE_IDS.map((id) => (
                    <TableCell key={id}>
                      <RoleCell
                        // Remounted after a change so the select always shows the current role.
                        key={`${id}-${roleOf(user, id) ?? "none"}`}
                        user={user}
                        moduleId={id}
                        role={roleOf(user, id)}
                        onChanged={handleChanged}
                      />
                    </TableCell>
                  ))
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {MODULE_IDS.map((id) => (
          <div key={id} className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Šta koja uloga smije: {MODULES[id].name}</h3>
            <dl className="space-y-2.5">
              {MODULES[id].roles.map((role) => (
                <div key={role}>
                  <dt className="text-sm font-medium">{MODULES[id].roleNames[role]}</dt>
                  <dd className="text-xs text-muted-foreground">{MODULES[id].roleDescriptions[role]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
