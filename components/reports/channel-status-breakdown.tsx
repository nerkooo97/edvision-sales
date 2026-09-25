"use client"

import * as React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RiMailLine, RiWhatsappLine } from "@remixicon/react"
import type { ChannelStatusBreakdown } from "@/lib/appwrite/reports"

interface ChannelStatusBreakdownProps {
  email: ChannelStatusBreakdown
  whatsapp: ChannelStatusBreakdown
}

const STATUS_ROWS: { key: keyof Omit<ChannelStatusBreakdown, "total">; label: string; barClass: string; hex: string }[] = [
  { key: "poslano", label: "Poslano", barClass: "bg-blue-500", hex: "#3b82f6" },
  { key: "otvoreno", label: "Otvoreno", barClass: "bg-amber-500", hex: "#f59e0b" },
  { key: "odgovoreno", label: "Odgovoreno", barClass: "bg-emerald-500", hex: "#10b981" },
  { key: "greska", label: "Greška", barClass: "bg-red-500", hex: "#ef4444" },
]

function StatusBars({ data }: { data: ChannelStatusBreakdown }) {
  const total = Math.max(data.total, 1)

  return (
    <div className="space-y-3">
      {STATUS_ROWS.map((row) => {
        const count = data[row.key]
        const percentage = Math.round((count / total) * 100)
        return (
          <div key={row.key} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{row.label}</span>
              <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                <span className="font-semibold text-foreground">{count}</span>
                <span className="text-[10px]">({percentage}%)</span>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${row.barClass}`}
                style={{ width: `${Math.max(percentage, count > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusDonut({ data }: { data: ChannelStatusBreakdown }) {
  const pieData = STATUS_ROWS.map((row) => ({
    name: row.label,
    value: data[row.key],
    color: row.hex,
  })).filter((d) => d.value > 0)

  return (
    <div className="relative h-[160px] w-full shrink-0 sm:w-[160px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload
                const pct = data.total > 0 ? Math.round((item.value / data.total) * 100) : 0
                return (
                  <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-md p-2.5 shadow-lg text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-popover-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-muted-foreground font-mono">
                      <span>{item.value}</span>
                      <span className="font-bold text-foreground">({pct}%)</span>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-bold tracking-tight font-mono text-foreground">{data.total}</span>
        <span className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider">Ukupno</span>
      </div>
    </div>
  )
}

export function ChannelStatusBreakdownCharts({ email, whatsapp }: ChannelStatusBreakdownProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RiMailLine className="size-4 text-blue-500" />
            Email poruke po statusu
          </CardTitle>
          <CardDescription className="text-xs">
            Pregled svih poslanih emailova prema ishodu (ukupno {email.total}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {email.total === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nema poslanih email poruka.</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <StatusDonut data={email} />
              <div className="w-full">
                <StatusBars data={email} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RiWhatsappLine className="size-4 text-emerald-500" />
            WhatsApp poruke po statusu
          </CardTitle>
          <CardDescription className="text-xs">
            Pregled svih poslanih WhatsApp poruka prema ishodu (ukupno {whatsapp.total}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {whatsapp.total === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nema poslanih WhatsApp poruka.</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <StatusDonut data={whatsapp} />
              <div className="w-full">
                <StatusBars data={whatsapp} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
