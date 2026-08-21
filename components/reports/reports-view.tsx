"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RiDownload2Line,
  RiBarChartBoxLine,
} from "@remixicon/react"
import type { ReportsData } from "@/lib/appwrite/reports"
import { AcquisitionChart } from "./acquisition-chart"
import { ConversionFunnel } from "./conversion-funnel"
import { ChannelPerformance } from "./channel-performance"
import { WebsiteDeficienciesChart } from "./website-deficiencies-chart"
import { StatusDonutChart } from "./status-donut-chart"

interface ReportsViewProps {
  initialData: ReportsData
}

export function ReportsView({ initialData }: ReportsViewProps) {
  const [period, setPeriod] = React.useState<"7d" | "30d" | "year">("7d")

  const acquisitionData =
    period === "7d"
      ? initialData.acquisition7Days
      : period === "30d"
      ? initialData.acquisition30Days
      : initialData.acquisitionYearWeeks

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!initialData.exportRows || initialData.exportRows.length === 0) {
      alert("Nema podataka za izvoz.")
      return
    }

    const headers = [
      "Kompanija",
      "Grad",
      "Telefon",
      "Email",
      "Status",
      "AI Score",
      "Posljednji kontakt",
      "Datum kreiranja",
    ]

    const csvContent = [
      headers.join(";"),
      ...initialData.exportRows.map((row) =>
        [
          `"${(row.kompanija || "").replace(/"/g, '""')}"`,
          `"${(row.grad || "").replace(/"/g, '""')}"`,
          `"${(row.telefon || "").replace(/"/g, '""')}"`,
          `"${(row.email || "").replace(/"/g, '""')}"`,
          `"${(row.status || "").replace(/"/g, '""')}"`,
          row.aiScore,
          `"${row.poslednjiKontakt}"`,
          `"${row.kreirano}"`,
        ].join(";")
      ),
    ].join("\n")

    // Add BOM for UTF-8 Excel support
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `edvision-sales-izvjestaj-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <RiBarChartBoxLine className="size-6 text-primary" />
            Analitika i izvještaji
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pregledajte performanse prodajnog procesa, lijevak konverzije i efikasnost kanala.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Period Selector */}
          <Select value={period} onValueChange={(val: "7d" | "30d" | "year") => setPeriod(val)}>
            <SelectTrigger className="w-[230px] h-9 text-xs font-medium cursor-pointer">
              <SelectValue placeholder="Odaberite period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Posljednjih 7 dana</SelectItem>
              <SelectItem value="30d">Posljednjih 30 dana</SelectItem>
              <SelectItem value="year">Trenutna godina (po sedmicama)</SelectItem>
            </SelectContent>
          </Select>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
          >
            <RiDownload2Line className="size-4" />
            Export u CSV
          </Button>
        </div>
      </div>

      {/* Row 1: Acquisition Area Chart & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AcquisitionChart data={acquisitionData} period={period} />
        <ConversionFunnel steps={initialData.funnelSteps} />
      </div>

      {/* Row 2: Website Deficiencies (Pain Points) & Status Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WebsiteDeficienciesChart deficiencies={initialData.websiteDeficiencies} />
        <StatusDonutChart
          data={initialData.statusDistribution}
          totalLeads={initialData.totalLeads}
        />
      </div>

      {/* Row 3: Channel Efficiency & Geographic Coverage */}
      <ChannelPerformance
        channels={initialData.channelMetrics}
        cities={initialData.cityMetrics}
        statusDistribution={initialData.statusDistribution}
      />
    </div>
  )
}
