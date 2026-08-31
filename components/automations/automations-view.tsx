"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RiCheckDoubleLine,
  RiPlayFill,
  RiStopCircleLine,
  RiExternalLinkLine,
  RiEyeLine,
  RiCloudLine,
  RiShieldCheckLine,
  RiSettings4Line,
  RiLoader4Line,
  RiCheckboxCircleLine,
  RiArrowDownLine,
  RiFlashlightLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { triggerN8nWorkflowManual, type AutomationsData } from "@/lib/appwrite/automations";
import {
  setWorkflowActiveStatus,
  triggerN8nFlow,
  stopN8nExecution,
  stopAllActiveN8nExecutions,
  fetchN8nExecutions,
} from "@/lib/n8n/client";
import { ExecutionDetailDialog } from "./execution-detail-dialog";
import {
  ThrottleSettingsDialog,
  type ThrottleSettings,
  DEFAULT_THROTTLE_SETTINGS,
} from "./throttle-settings-dialog";
import type { N8nExecution } from "@/lib/n8n/types";

interface AutomationsViewProps {
  initialData?: AutomationsData;
}

export function AutomationsView({ initialData }: AutomationsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<AutomationsData>(
    initialData || {
      isActive: true,
      processedToday: 0,
      errorsToday: 0,
      totalOutreach: 0,
      nextSchedule: "09:00h (Outreach) / 10:00h (Follow-up)",
      recentLogs: [],
      workflows: [],
      executions: [],
      n8nConnected: false,
    }
  );

  // Lista ID-jeva egzekucija koje je korisnik ručno zaustavio u trenutnoj sesiji (prevencija vraćanja starog stanja)
  const [stoppedExecutionIds, setStoppedExecutionIds] = useState<string[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [triggeringFlow, setTriggeringFlow] = useState<"outreach" | "followup" | "full" | null>(null);
  const [recentlySuccessFlow, setRecentlySuccessFlow] = useState<"outreach" | "followup" | "full" | null>(null);
  const [activeRunningFlow, setActiveRunningFlow] = useState<"outreach" | "followup" | "full" | null>(null);
  const [stoppingTarget, setStoppingTarget] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Perzistentne informacije o zadnjem ručnom pokretanju
  const [lastTriggeredInfo, setLastTriggeredInfo] = useState<{
    flowType: "outreach" | "followup" | "full";
    time: string;
    limit?: number;
    delay?: number;
  } | null>(null);

  // Throttle postavke (Limit & Pauza)
  const [throttleSettings, setThrottleSettings] = useState<ThrottleSettings>(DEFAULT_THROTTLE_SETTINGS);

  // Sinhronizacija kada server osvježi podatke (uz uvažavanje ručno zaustavljenih egzekucija)
  useEffect(() => {
    if (initialData) {
      setData({
        ...initialData,
        executions: initialData.executions.map((e) =>
          stoppedExecutionIds.includes(e.id) ? { ...e, status: "canceled" as const, finished: true } : e
        ),
      });
    }
  }, [initialData, stoppedExecutionIds]);

  // Učitaj perzistentne podatke iz localStorage nakon montaže na klijentu
  useEffect(() => {
    setMounted(true);
    try {
      const savedTrigger = localStorage.getItem("edvision_last_manual_trigger");
      if (savedTrigger) setLastTriggeredInfo(JSON.parse(savedTrigger));
    } catch (e) {}
    try {
      const savedThrottle = localStorage.getItem("edvision_sales_throttle_settings");
      if (savedThrottle) setThrottleSettings(JSON.parse(savedThrottle));
    } catch (e) {}
  }, []);

  const saveLastTriggeredInfo = (
    info: {
      flowType: "outreach" | "followup" | "full";
      time: string;
      limit?: number;
      delay?: number;
    } | null
  ) => {
    setLastTriggeredInfo(info);
    if (typeof window !== "undefined") {
      try {
        if (info) {
          localStorage.setItem("edvision_last_manual_trigger", JSON.stringify(info));
        } else {
          localStorage.removeItem("edvision_last_manual_trigger");
        }
      } catch (e) {}
    }
  };

  const handleSaveThrottleSettings = (newSettings: ThrottleSettings) => {
    setThrottleSettings(newSettings);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("edvision_sales_throttle_settings", JSON.stringify(newSettings));
      } catch (e) {}
    }
  };

  const [togglingWorkflowId, setTogglingWorkflowId] = useState<string | null>(null);

  // Glavni workflow
  const mainWorkflow = data.workflows?.[0] || null;
  const isWorkflowActive = mainWorkflow ? mainWorkflow.active : data.isActive;

  // Filtrirane egzekucije koje uvažavaju stoppedExecutionIds
  const currentExecutions = data.executions.map((e) =>
    stoppedExecutionIds.includes(e.id) ? { ...e, status: "canceled" as const, finished: true } : e
  );

  // 1. Aktivna Outreach egzekucija (running ili waiting u warmup pauzi)
  const activeOutreachExec = currentExecutions.find(
    (e) =>
      !e.finished &&
      (e.status === "running" || e.status === "waiting") &&
      (e.flowType === "outreach" || (activeRunningFlow === "outreach" && e.id.startsWith("live-")))
  );

  // 2. Aktivna Follow-up egzekucija
  const activeFollowupExec = currentExecutions.find(
    (e) =>
      !e.finished &&
      (e.status === "running" || e.status === "waiting") &&
      (e.flowType === "followup" || (activeRunningFlow === "followup" && e.id.startsWith("live-")))
  );

  // 3. Zadnje stvarne završene egzekucije (isključujući brze tracking piksele)
  const latestRealOutreachExec = currentExecutions.find(
    (e) => !e.id.startsWith("live-") && e.flowType === "outreach" && e.finished
  );

  const latestRealFollowupExec = currentExecutions.find(
    (e) => !e.id.startsWith("live-") && e.flowType === "followup" && e.finished
  );

  // Strogo izolovana stanja aktivnosti
  const isOutreachRunning = Boolean(activeOutreachExec || activeRunningFlow === "outreach");
  const isFollowupRunning = Boolean(activeFollowupExec || activeRunningFlow === "followup");
  const isFullRunning = activeRunningFlow === "full";
  const isAnyExecutionRunning = isOutreachRunning || isFollowupRunning || isFullRunning;

  // Automatsko usklađivanje lokalnog stanja kada n8n server potvrdi egzekuciju
  useEffect(() => {
    if (activeOutreachExec && activeRunningFlow === "outreach") {
      setActiveRunningFlow(null);
    }
    if (activeFollowupExec && activeRunningFlow === "followup") {
      setActiveRunningFlow(null);
    }
  }, [activeOutreachExec, activeFollowupExec, activeRunningFlow]);

  // Pametno automatsko osvježavanje: 3 sekunde dok proces radi, 10 sekundi u pozadini
  useEffect(() => {
    const intervalTime = isAnyExecutionRunning ? 3000 : 10000;

    const interval = setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isAnyExecutionRunning, router]);

  // Ručno osvježavanje
  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
      toast.info("Podaci su osvježeni sa n8n i Appwrite servera.");
    });
  };

  // Pokretanje specifičnog toka sa međusobnim zaključavanjem
  const handleTriggerFlow = async (flowType: "outreach" | "followup" | "full") => {
    if (triggeringFlow || isAnyExecutionRunning) {
      toast.warning("Drugi proces automatizacije je već aktivan. Sačekajte završetak ili ga zaustavite.");
      return;
    }

    setTriggeringFlow(flowType);
    setActiveRunningFlow(flowType);
    const nowTime = new Date().toLocaleTimeString("bs-BA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const flowNames: Record<string, string> = {
      outreach: `Email Outreach (${throttleSettings.dailyLimit} firmi, ${throttleSettings.delayMinutes}m pauza)`,
      followup: "Follow-up & WhatsApp",
      full: `Kompletan sistem (${throttleSettings.dailyLimit} firmi)`,
    };

    toast.loading(`Pokretanje toka: ${flowNames[flowType]}...`, { id: "flow-trigger" });

    try {
      const result = await triggerN8nFlow(flowType, {
        dailyLimit: throttleSettings.dailyLimit,
        delayMinutes: throttleSettings.delayMinutes,
      });

      if (result.success) {
        toast.success(result.message, {
          id: "flow-trigger",
          description: `n8n server je započeo rad. Slanje emailova je u toku.`,
          duration: 5000,
        });

        saveLastTriggeredInfo({
          flowType,
          time: nowTime,
          limit: throttleSettings.dailyLimit,
          delay: throttleSettings.delayMinutes,
        });

        setRecentlySuccessFlow(flowType);
        setTimeout(() => setRecentlySuccessFlow(null), 3000);

        // Dodaj optimistički zapis u egzekucije uživo sa tačnim flowType-om
        const optimisticExecution: N8nExecution = {
          id: `live-${Date.now().toString().slice(-4)}`,
          status: "running",
          mode: "webhook",
          startedAt: new Date().toISOString(),
          workflowId: mainWorkflow?.id || "sales-flow",
          workflowName: mainWorkflow?.name || "Kompletan Sales Sistem",
          finished: false,
          flowType: flowType === "full" ? "outreach" : flowType,
          flowLabel:
            flowType === "outreach"
              ? "Email Outreach"
              : flowType === "followup"
              ? "Follow-up & WhatsApp"
              : "Kompletan prodajni ciklus",
        };

        setData((prev) => ({
          ...prev,
          executions: [optimisticExecution, ...prev.executions.filter((e) => !e.id.startsWith("live-"))],
        }));

        // Osvježavanje sa servera nakon kraće pauze
        setTimeout(() => router.refresh(), 2000);
        setTimeout(() => router.refresh(), 5000);
      } else {
        setActiveRunningFlow(null);
        toast.error(result.message, { id: "flow-trigger" });
      }
    } catch (err) {
      setActiveRunningFlow(null);
      toast.error("Greška pri slanju trigger zahtjeva ka n8n serveru.", { id: "flow-trigger" });
    } finally {
      setTriggeringFlow(null);
    }
  };

  // Uključivanje / Isključivanje workflow-a (Aktiviraj / Pauziraj raspored)
  const handleToggleActive = async (workflowId: string, currentStatus: boolean) => {
    const targetStatus = !currentStatus;
    setTogglingWorkflowId(workflowId);
    toast.loading(targetStatus ? "Aktiviranje rasporeda..." : "Pauziranje rasporeda...", {
      id: "wf-toggle",
    });

    try {
      const res = await setWorkflowActiveStatus(workflowId, targetStatus);
      if (res.success) {
        toast.success(res.message, { id: "wf-toggle" });
        setData((prev) => ({
          ...prev,
          isActive: targetStatus,
          workflows: prev.workflows.map((w) =>
            w.id === workflowId ? { ...w, active: targetStatus } : w
          ),
          nextSchedule: targetStatus ? "09:00h (Outreach) / 10:00h (Follow-up)" : "Pauzirano",
        }));
      } else {
        toast.error(res.message, { id: "wf-toggle" });
      }
    } catch (err) {
      toast.error("Greška pri promjeni statusa na n8n serveru.", { id: "wf-toggle" });
    } finally {
      setTogglingWorkflowId(null);
    }
  };

  // Zaustavljanje aktivnih egzekucija (ciljano ili sve)
  const handleStopExecution = async (target?: "outreach" | "followup" | "all" | string) => {
    const targetType = target || "all";
    setStoppingTarget(targetType);
    toast.loading("Zaustavljanje procesa na n8n serveru...", { id: "exec-stop" });

    // Pronađi ID-jeve egzekucija koje zaustavljamo
    let targetIdsToStop: string[] = [];
    if (targetType === "outreach" && activeOutreachExec) {
      targetIdsToStop = [activeOutreachExec.id];
    } else if (targetType === "followup" && activeFollowupExec) {
      targetIdsToStop = [activeFollowupExec.id];
    } else if (targetType === "all") {
      targetIdsToStop = currentExecutions
        .filter((e) => !e.finished && (e.status === "running" || e.status === "waiting"))
        .map((e) => e.id);
    } else if (target && !target.startsWith("live-") && target !== "outreach" && target !== "followup") {
      targetIdsToStop = [target];
    }

    // Dodaj u stoppedExecutionIds da se spriječi titranje
    if (targetIdsToStop.length > 0) {
      setStoppedExecutionIds((prev) => Array.from(new Set([...prev, ...targetIdsToStop])));
    }

    // Optimistički ažuriraj lokalno stanje
    setActiveRunningFlow((prev) => {
      if (targetType === "all" || prev === targetType) return null;
      return prev;
    });

    setData((prev) => ({
      ...prev,
      executions: prev.executions
        .filter((e) => !e.id.startsWith("live-"))
        .map((e) =>
          targetIdsToStop.includes(e.id) || (targetType === "all" && !e.finished)
            ? { ...e, status: "canceled" as const, finished: true }
            : e
        ),
    }));

    try {
      let res;
      if (target && !["outreach", "followup", "all"].includes(target) && !target.startsWith("live-")) {
        res = await stopN8nExecution(target);
      } else {
        res = await stopAllActiveN8nExecutions();
      }

      toast.success(res?.message || "Proces je uspješno zaustavljen.", { id: "exec-stop" });
      saveLastTriggeredInfo(null);

      // Osvježi sa servera nakon što n8n sigurno završi prekid procesa
      setTimeout(() => {
        router.refresh();
      }, 2500);
    } catch (err) {
      toast.info("Aktivno stanje slanja je zaustavljeno.", { id: "exec-stop" });
      saveLastTriggeredInfo(null);
    } finally {
      setStoppingTarget(null);
    }
  };

  const handleOpenDetail = (id: string) => {
    setSelectedExecutionId(id);
    setIsDetailOpen(true);
  };

  const formatDuration = (ms?: number) => {
    if (ms === undefined || ms === null) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    const sec = (ms / 1000).toFixed(1);
    if (ms >= 60000) {
      const mins = Math.floor(ms / 60000);
      const remSec = Math.round((ms % 60000) / 1000);
      return `${mins}m ${remSec}s`;
    }
    return `${sec}s`;
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
    <div className="h-full flex-1 flex-col space-y-4 sm:space-y-5 p-4 sm:p-6 lg:p-7 flex min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Kontrolna tabla automatizacije
            </h2>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] sm:text-xs gap-1.5 py-0.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              n8n API Povezan
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 truncate">
            Uživo nadzor n8n prodajnog sistema, upravljanje tokovima, rasporedom i egzekucijama.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {isAnyExecutionRunning && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleStopExecution("all")}
              disabled={stoppingTarget !== null}
              className="h-8 sm:h-9 text-xs sm:text-sm shadow-sm bg-rose-600 hover:bg-rose-700 text-white gap-1.5 animate-in fade-in duration-300"
            >
              <RiStopCircleLine className={`w-3.5 h-3.5 ${stoppingTarget ? "animate-spin" : ""}`} />
              {stoppingTarget ? "Zaustavljanje..." : "Zaustavi sve procese"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            className="h-8 sm:h-9 text-xs sm:text-sm shadow-sm"
          >
            <RiRefreshLine className={`w-3.5 h-3.5 mr-1.5 ${isPending ? "animate-spin" : ""}`} />
            Osvježi
          </Button>

          <Button
            size="sm"
            onClick={() => handleTriggerFlow("full")}
            disabled={triggeringFlow !== null || isAnyExecutionRunning}
            title={isAnyExecutionRunning ? "Proces je već u toku" : "Pokreni puni ciklus"}
            className={`h-8 sm:h-9 text-xs sm:text-sm shadow-sm transition-all ${
              recentlySuccessFlow === "full"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {triggeringFlow === "full" ? (
              <>
                <RiLoader4Line className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Pokretanje...
              </>
            ) : recentlySuccessFlow === "full" ? (
              <>
                <RiCheckboxCircleLine className="w-3.5 h-3.5 mr-1.5" />
                Pokrenuto!
              </>
            ) : (
              <>
                <RiPlayFill className="w-3.5 h-3.5 mr-1" />
                Pokreni puni ciklus
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: n8n API Connection */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RiCloudLine className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground font-medium mb-0.5">n8n Cloud Status</p>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-bold truncate">Online i aktivan</h3>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                edvision.app.n8n.cloud
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Next Schedule / Active status */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div
              className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
                isWorkflowActive
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              <RiTimeLine className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Automatski raspored</p>
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                {isWorkflowActive ? "1x dnevno (u 07:00h)" : "Pauzirano"}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                {isWorkflowActive ? "Loop svakih 15m (50 firmi)" : "Raspored isključen"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Processed Today */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl shrink-0">
              <RiBuildingLine className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Obrađeno danas</p>
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                {data.processedToday}{" "}
                {data.processedToday === 1
                  ? "firma"
                  : data.processedToday >= 2 && data.processedToday <= 4
                  ? "firme"
                  : "firmi"}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                {data.errorsToday > 0 ? (
                  <span className="text-red-500 font-medium">{data.errorsToday} grešaka</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Sve bez grešaka
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Executions */}
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
              <RiShieldCheckLine className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground font-medium mb-0.5">Ukupno kontakata</p>
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                {data.totalOutreach}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                Evidentirano u bazi
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Workflow Controls (Individual Flow Triggers & Switches) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-semibold">Aktivni tokovi automatizacije</h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Upravljanje pojedinačnim fazama prodajnog procesa, pokretanje na zahtjev i kontrola rasporeda.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Flow 1: Email Outreach & AI Analiza */}
          <Card
            className={`border shadow-sm bg-card transition-all ${
              isOutreachRunning ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "hover:border-primary/30"
            }`}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3.5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg shrink-0">
                      <RiMailLine className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs sm:text-sm truncate">1. Email Outreach i analiza Weba</h4>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground block truncate">
                        PageSpeed • OpenAI Vision • SMTP slanje
                      </span>
                    </div>
                  </div>

                  {mainWorkflow && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] sm:text-xs shrink-0 ${
                        mainWorkflow.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {mainWorkflow.active ? "Raspored aktivan" : "Pauzirano"}
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed pt-0.5">
                  Automatski preuzima kompanije iz baze, provjerava domenu i PageSpeed brzinu,
                  generiše personalizovanu ponudu putem AI modela i šalje verifikovan email sa
                  grafičkim potpisom.
                </p>

                {/* Dinamički parametri slanja & Warmup badge */}
                <div className="flex items-center justify-between gap-2 p-2 bg-muted/40 rounded-lg border text-xs mt-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] text-muted-foreground min-w-0">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <RiBuildingLine className="w-3.5 h-3.5 text-primary shrink-0" />
                      50 firmi / ciklus
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <RiTimeLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      15m pauza (1x dnevno)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSettingsOpen(true)}
                    className="h-6 px-2 text-[11px] font-medium gap-1 text-primary hover:bg-primary/10 shrink-0"
                  >
                    <RiSettings4Line className="w-3 h-3" />
                    Podesi
                  </Button>
                </div>

                {/* Status aktivnog Outreach toka */}
                {isOutreachRunning ? (
                  <div className="flex items-center justify-between gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-medium truncate">
                        {activeOutreachExec?.mode === "trigger"
                          ? `Automatski Outreach u toku (Pokrenut u ${formatDateTime(activeOutreachExec?.startedAt || "")})`
                          : `Email Outreach je u toku (${lastTriggeredInfo?.limit || throttleSettings.dailyLimit} firmi)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                        {activeOutreachExec?.status === "waiting" ? "Pauza" : "U toku"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={stoppingTarget !== null}
                        onClick={() => handleStopExecution("outreach")}
                        className="h-6 px-1.5 text-[10px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/50 gap-1"
                      >
                        <RiStopCircleLine className="w-3 h-3" />
                        {stoppingTarget === "outreach" ? "..." : "Zaustavi"}
                      </Button>
                    </div>
                  </div>
                ) : latestRealOutreachExec ? (
                  <div className="flex items-center justify-between gap-2 p-2 bg-muted/60 border rounded-lg text-xs text-muted-foreground animate-in fade-in duration-300">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <RiCheckboxCircleLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] truncate">
                        Zadnje pokretanje Outreacha: {formatDateTime(latestRealOutreachExec.startedAt)} (
                        {latestRealOutreachExec.mode === "trigger" ? "Automatski ciklus" : "Ručno"}
                        )
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                      Spreman za rad
                    </span>
                  </div>
                ) : lastTriggeredInfo?.flowType === "outreach" ? (
                  <div className="flex items-center justify-between gap-2 p-2 bg-muted/60 border rounded-lg text-xs text-muted-foreground animate-in fade-in duration-300">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <RiCheckboxCircleLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] truncate">
                        Zadnje slanje pokrenuto u {lastTriggeredInfo.time} ({lastTriggeredInfo.limit} firmi, {lastTriggeredInfo.delay}m pauza)
                      </span>
                    </div>
                    <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded shrink-0">
                      Ručno
                    </span>
                  </div>
                ) : null}

                {/* Schedule info */}
                {mainWorkflow && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5">
                      <RiTimeLine className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>
                        {mainWorkflow.active
                          ? "Automatski raspored aktivan: 07:00h (50 firmi dnevno)"
                          : "Automatski raspored je pauziran"}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ID: {mainWorkflow.id.slice(0, 8)}...
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2.5">
                {mainWorkflow ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mainWorkflow.active}
                      disabled={togglingWorkflowId === mainWorkflow.id}
                      onCheckedChange={() =>
                        handleToggleActive(mainWorkflow.id, mainWorkflow.active)
                      }
                      id="outreach-schedule"
                    />
                    <label
                      htmlFor="outreach-schedule"
                      className="text-[11px] sm:text-xs font-medium cursor-pointer text-muted-foreground select-none"
                    >
                      {mainWorkflow.active ? "Raspored aktivan (07:00h)" : "Isključeno"}
                    </label>
                  </div>
                ) : (
                  <span className="text-[11px] sm:text-xs text-muted-foreground">Raspored: 07:00–18:00h</span>
                )}

                <div className="flex items-center gap-2">
                  {isOutreachRunning ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStopExecution("outreach")}
                      disabled={stoppingTarget !== null}
                      className="h-8 text-xs font-bold gap-1.5 shadow-sm bg-rose-600 hover:bg-rose-700 text-white animate-in fade-in"
                    >
                      <RiStopCircleLine className={`w-3.5 h-3.5 ${stoppingTarget === "outreach" ? "animate-spin" : ""}`} />
                      {stoppingTarget === "outreach" ? "Zaustavljanje..." : "Zaustavi slanje"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={recentlySuccessFlow === "outreach" ? "secondary" : "outline"}
                      onClick={() => handleTriggerFlow("outreach")}
                      disabled={
                        triggeringFlow !== null ||
                        isOutreachRunning ||
                        isFollowupRunning ||
                        isFullRunning
                      }
                      title={
                        isFollowupRunning
                          ? "Follow-up proces je trenutno u toku"
                          : isFullRunning
                          ? "Puni ciklus je u toku"
                          : "Pokreni Email Outreach"
                      }
                      className={`h-8 text-xs font-medium transition-all ${
                        recentlySuccessFlow === "outreach"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "hover:bg-primary hover:text-primary-foreground"
                      }`}
                    >
                      {triggeringFlow === "outreach" ? (
                        <>
                          <RiLoader4Line className="w-3.5 h-3.5 mr-1.5 animate-spin text-primary" />
                          Pokretanje...
                        </>
                      ) : recentlySuccessFlow === "outreach" ? (
                        <>
                          <RiCheckboxCircleLine className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                          Pokrenuto!
                        </>
                      ) : (
                        <>
                          <RiPlayFill className="w-3.5 h-3.5 mr-1 text-primary" />
                          Pokreni Outreach
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flow 2: Follow-up & WhatsApp */}
          <Card
            className={`border shadow-sm bg-card transition-all ${
              isFollowupRunning ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "hover:border-primary/30"
            }`}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-3.5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0">
                      <RiWhatsappLine className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs sm:text-sm truncate">2. Follow-up i WhatsApp podsjetnik</h4>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground block truncate">
                        IMAP provjera • WhatsApp poruke • Slack notifikacije
                      </span>
                    </div>
                  </div>

                  {mainWorkflow && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] sm:text-xs shrink-0 ${
                        mainWorkflow.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {mainWorkflow.active ? "Raspored aktivan" : "Pauzirano"}
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed pt-0.5">
                  Provjerava pristigle odgovore u Inboxu, ažurira status u pregovorima, šalje
                  WhatsApp podsjetnike firmama sa brojem telefona i šalje instant Slack obavijesti
                  o zainteresovanim klijentima.
                </p>

                {/* Dinamički parametri / kanali Follow-up toka */}
                <div className="flex items-center justify-between gap-2 p-2 bg-muted/40 rounded-lg border text-xs mt-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] text-muted-foreground min-w-0">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <RiMailLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      IMAP Inbox provjera
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <RiWhatsappLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      WhatsApp podsjetnici
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0.5 px-1.5 shrink-0">
                    07:30h / 17:00h
                  </Badge>
                </div>

                {/* Status aktivnog Follow-up toka */}
                {isFollowupRunning ? (
                  <div className="flex items-center justify-between gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-medium truncate">
                        {activeFollowupExec?.mode === "trigger"
                          ? `Automatski Follow-up u toku (Pokrenut u ${formatDateTime(activeFollowupExec?.startedAt || "")})`
                          : `Follow-up & WhatsApp obrada je u toku`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                        U toku
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={stoppingTarget !== null}
                        onClick={() => handleStopExecution("followup")}
                        className="h-6 px-1.5 text-[10px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/50 gap-1"
                      >
                        <RiStopCircleLine className="w-3 h-3" />
                        {stoppingTarget === "followup" ? "..." : "Zaustavi"}
                      </Button>
                    </div>
                  </div>
                ) : latestRealFollowupExec ? (
                  <div className="flex items-center justify-between gap-2 p-2 bg-muted/60 border rounded-lg text-xs text-muted-foreground animate-in fade-in duration-300">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <RiCheckboxCircleLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] truncate">
                        Zadnje pokretanje Follow-up-a: {formatDateTime(latestRealFollowupExec.startedAt)} (
                        {latestRealFollowupExec.mode === "trigger" ? "Automatski ciklus" : "Ručno"}
                        )
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                      Spreman za rad
                    </span>
                  </div>
                ) : lastTriggeredInfo?.flowType === "followup" ? (
                  <div className="flex items-center justify-between gap-2 p-2 bg-muted/60 border rounded-lg text-xs text-muted-foreground animate-in fade-in duration-300">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <RiCheckboxCircleLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] truncate">
                        Follow-up pokrenut u {lastTriggeredInfo.time}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded shrink-0">
                      Ručno
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-2 bg-muted/40 border rounded-lg text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <RiTimeLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] truncate">
                        Automatski raspored aktivan svakog dana
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-foreground font-medium shrink-0">
                      07:30h / 17:00h
                    </span>
                  </div>
                )}

                {/* Schedule info */}
                {mainWorkflow && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5">
                      <RiTimeLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {mainWorkflow.active
                          ? "Automatski raspored aktivan: Dvaput dnevno u 07:30h i 17:00h"
                          : "Automatski raspored je pauziran"}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ID: {mainWorkflow.id.slice(0, 8)}...
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t flex flex-wrap items-center justify-between gap-2.5">
                {mainWorkflow ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mainWorkflow.active}
                      disabled={togglingWorkflowId === mainWorkflow.id}
                      onCheckedChange={() =>
                        handleToggleActive(mainWorkflow.id, mainWorkflow.active)
                      }
                      id="followup-schedule"
                    />
                    <label
                      htmlFor="followup-schedule"
                      className="text-[11px] sm:text-xs font-medium cursor-pointer text-muted-foreground select-none"
                    >
                      {mainWorkflow.active ? "Raspored (07:30h / 17:00h)" : "Isključeno"}
                    </label>
                  </div>
                ) : (
                  <span className="text-[11px] sm:text-xs text-muted-foreground">Raspored: 07:30h / 17:00h</span>
                )}

                {isFollowupRunning ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStopExecution("followup")}
                    disabled={stoppingTarget !== null}
                    className="h-8 text-xs font-bold gap-1.5 shadow-sm bg-rose-600 hover:bg-rose-700 text-white animate-in fade-in"
                  >
                    <RiStopCircleLine className={`w-3.5 h-3.5 ${stoppingTarget === "followup" ? "animate-spin" : ""}`} />
                    {stoppingTarget === "followup" ? "Zaustavljanje..." : "Zaustavi Follow-up"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={recentlySuccessFlow === "followup" ? "secondary" : "outline"}
                    onClick={() => handleTriggerFlow("followup")}
                    disabled={
                      triggeringFlow !== null ||
                      isFollowupRunning ||
                      isOutreachRunning ||
                      isFullRunning
                    }
                    title={
                      isOutreachRunning
                        ? "Email Outreach je trenutno u toku"
                        : isFullRunning
                        ? "Puni ciklus je u toku"
                        : "Pokreni Follow-up"
                    }
                    className={`h-8 text-xs font-medium transition-all ${
                      recentlySuccessFlow === "followup"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    {triggeringFlow === "followup" ? (
                      <>
                        <RiLoader4Line className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-600" />
                        Pokretanje...
                      </>
                    ) : recentlySuccessFlow === "followup" ? (
                      <>
                        <RiCheckboxCircleLine className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                        Pokrenuto!
                      </>
                    ) : (
                      <>
                        <RiPlayFill className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Pokreni Follow-up
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Tabs for Live n8n Executions & Database Logs */}
      <Tabs defaultValue="executions" className="flex-1 flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="executions" className="text-xs gap-1.5">
              <RiCloudLine className="w-3.5 h-3.5" />
              n8n Egzekucije Uživo
              {currentExecutions.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-mono">
                  {currentExecutions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs gap-1.5">
              <RiMailLine className="w-3.5 h-3.5" />
              Dnevnik Kontakata (Appwrite)
              {data.recentLogs.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-mono">
                  {data.recentLogs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-muted-foreground">
            Direktna sinhronizacija sa n8n API-jem
          </span>
        </div>

        {/* Tab 1: Live n8n Executions */}
        <TabsContent value="executions" className="m-0 space-y-4">
          <Card className="border shadow-sm bg-card">
            <div className="p-0">
              {currentExecutions.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <RiInformationLine className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm font-medium">Još nema zabilježenih egzekucija u n8n-u.</p>
                  <p className="text-xs mt-1 opacity-70">
                    Pokrenite ciklus putem dugmeta iznad kako bi se kreirala prva egzekucija.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {currentExecutions.map((exec) => {
                    const isRunning = exec.status === "running" || exec.status === "waiting";
                    const isSuccess = exec.status === "success";
                    const isError = exec.status === "error";
                    const isCanceled = exec.status === "canceled";

                    // Tip i oznaka toka
                    const isOutreach = exec.flowType === "outreach";
                    const isFollowup = exec.flowType === "followup";
                    const isTracking = exec.flowType === "tracking";

                    return (
                      <div
                        key={exec.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="mt-0.5 sm:mt-0 shrink-0">
                            {isRunning ? (
                              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg animate-spin">
                                <RiRefreshLine className="w-4 h-4" />
                              </div>
                            ) : isError ? (
                              <div className="p-2 bg-red-500/10 text-red-600 rounded-lg">
                                <RiErrorWarningLine className="w-4 h-4" />
                              </div>
                            ) : isCanceled ? (
                              <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                                <RiStopCircleLine className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                                <RiCheckDoubleLine className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-foreground">
                                #{exec.id}
                              </span>

                              {/* Flow label badge */}
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-semibold ${
                                  isOutreach
                                    ? "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300"
                                    : isFollowup
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300"
                                    : isTracking
                                    ? "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-300"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {exec.flowLabel || (isOutreach ? "Email Outreach" : isFollowup ? "Follow-up" : "n8n Tok")}
                              </Badge>

                              {/* Status badge */}
                              <Badge
                                variant="outline"
                                className={`text-[11px] ${
                                  isSuccess
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                                    : isRunning
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 animate-pulse"
                                    : isError
                                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
                                    : isCanceled
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {isSuccess
                                  ? "Uspješno"
                                  : exec.status === "waiting"
                                  ? "Warmup pauza"
                                  : isRunning
                                  ? "U toku izvršavanja..."
                                  : isError
                                  ? "Greška"
                                  : isCanceled
                                  ? "Zaustavljeno"
                                  : exec.status}
                              </Badge>

                              <span className="text-xs text-muted-foreground uppercase font-semibold">
                                • {exec.mode}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>Pokrenuto: {formatDateTime(exec.startedAt)}</span>
                              {exec.durationMs !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 font-medium">
                                    <RiTimeLine className="w-3 h-3" />
                                    {formatDuration(exec.durationMs)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isRunning && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStopExecution(exec.id)}
                              disabled={stoppingTarget === exec.id}
                              className="text-xs h-8 gap-1"
                            >
                              <RiStopCircleLine className="w-3.5 h-3.5" />
                              {stoppingTarget === exec.id ? "Zaustavljanje..." : "Zaustavi"}
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetail(exec.id)}
                            className="text-xs h-8 gap-1"
                          >
                            <RiEyeLine className="w-3.5 h-3.5" />
                            Detalji čvorova
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Database Contact Logs */}
        <TabsContent value="logs" className="m-0 space-y-4">
          <Card className="border shadow-sm bg-card">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Sistemski logovi (Uživo iz baze)</h3>
                <Badge variant="secondary" className="text-xs font-normal">
                  Ukupno zabilježeno: {data.totalOutreach}
                </Badge>
              </div>
              <span className="text-xs bg-muted px-2.5 py-1 rounded-md text-muted-foreground font-medium">
                Prikaz posljednjih 15 aktivnosti
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
                      <div
                        key={log.id}
                        className="p-4 flex gap-4 hover:bg-muted/40 transition-colors items-start"
                      >
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
                                log.status === "Otvoreno"
                                  ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900 font-semibold"
                                  : log.status === "Poslano"
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
        </TabsContent>
      </Tabs>

      {/* Execution detail modal */}
      <ExecutionDetailDialog
        executionId={selectedExecutionId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedExecutionId(null);
        }}
        onExecutionStopped={() => {
          router.refresh();
        }}
      />

      {/* Throttle Settings modal (Dnevni limit & Warmup pauza) */}
      <ThrottleSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={throttleSettings}
        onSave={handleSaveThrottleSettings}
      />
    </div>
  );
}
