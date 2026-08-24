"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  RiRefreshLine,
  RiInformationLine,
  RiMailLine,
  RiWhatsappLine,
  RiPhoneLine,
  RiCalendarEventLine,
  RiErrorWarningLine,
  RiTimeLine,
  RiBuildingLine,
  RiCheckDoubleLine
} from "@remixicon/react";
import { toast } from "sonner";
import { triggerN8nWorkflowManual, type AutomationsData } from "@/lib/appwrite/automations";

interface AutomationsViewProps {
  initialData?: AutomationsData;
}

export function AutomationsView({ initialData }: AutomationsViewProps) {
  const [isPending, startTransition] = useTransition();
  const [data] = useState<AutomationsData>(
    initialData || {
      isActive: true,
      processedToday: 0,
      errorsToday: 0,
      totalOutreach: 0,
      nextSchedule: "09:00h (Outreach) / 10:00h (Follow-up)",
      recentLogs: [],
    }
  );

  const handleManualRun = () => {
    startTransition(async () => {
      toast.loading("Slanje signala prema n8n sistemu...", { id: "n8n-trigger" });
      const result = await triggerN8nWorkflowManual();
      if (result.success) {
        toast.success(result.message, { id: "n8n-trigger" });
      } else {
        toast.error(result.message, { id: "n8n-trigger" });
      }
    });
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}.${month}.${year}. ${hours}:${minutes}h`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="h-full flex-1 flex-col space-y-6 p-8 flex">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kontrolna tabla automatizacije</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Uživo nadzor n8n prodajnog sistema, rasporeda ciklusa i historije kontakata.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleManualRun}
            disabled={isPending}
            className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <RiRefreshLine className={`w-4 h-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Pokretanje u toku..." : "Pokreni ručno (POST)"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Service Status */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RiCheckDoubleLine className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Status sistema</p>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Povezan i spreman</h3>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Webhook je povezan (Publish u n8n-u)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Next Schedule */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              <RiTimeLine className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Sljedeće pokretanje</p>
              <h3 className="text-lg font-bold text-foreground">09:00h / 10:00h</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Svaki dan (Email Outreach + WhatsApp)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Processed Today */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl shrink-0">
              <RiBuildingLine className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Obrađeno danas</p>
              <h3 className="text-lg font-bold text-foreground">
                {data.processedToday} {data.processedToday === 1 ? "firma" : data.processedToday >= 2 && data.processedToday <= 4 ? "firme" : "firmi"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.errorsToday > 0 ? (
                  <span className="text-red-500 font-medium">{data.errorsToday} grešaka detektovano</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Sve proteklo bez grešaka</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Section */}
      <Card className="border shadow-sm flex-1 mb-8 bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">Sistemski logovi (Uživo iz baze)</h3>
            <Badge variant="secondary" className="text-xs font-normal">
              Ukupno zabilježeno: {data.totalOutreach}
            </Badge>
          </div>
          <span className="text-xs bg-muted px-2.5 py-1 rounded-md text-muted-foreground font-medium">
            Prikaz posljednjih aktivnosti
          </span>
        </div>
        <div className="p-0">
          {data.recentLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <RiInformationLine className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-medium">Još uvijek nema zabilježenih logova za prikaz.</p>
              <p className="text-xs mt-1 opacity-70">
                Pokrenite ciklus ručno ili sačekajte jutarnji raspored za prve unose u bazu.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.recentLogs.map((log) => {
                const isWhatsApp = log.type === "whatsapp";
                const isCall = log.type === "call";
                const isMeeting = log.type === "meeting";
                const isError = log.type === "error";

                return (
                  <div key={log.id} className="p-4 flex gap-4 hover:bg-muted/40 transition-colors items-start">
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      {isError ? (
                        <div className="p-2 bg-red-500/10 text-red-600 rounded-lg">
                          <RiErrorWarningLine className="w-4 h-4" />
                        </div>
                      ) : isWhatsApp ? (
                        <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                          <RiWhatsappLine className="w-4 h-4" />
                        </div>
                      ) : isCall ? (
                        <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                          <RiPhoneLine className="w-4 h-4" />
                        </div>
                      ) : isMeeting ? (
                        <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                          <RiCalendarEventLine className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                          <RiMailLine className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <p className="text-sm font-medium text-foreground truncate">
                          {log.title}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            log.status === "Poslano" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900" 
                              : log.status === "Odgovoreno" 
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {log.status}
                        </Badge>
                      </div>

                      {log.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {log.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                        <span suppressHydrationWarning>{formatDateTime(log.timestamp)}</span>
                        {log.recipient && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">{log.recipient}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
