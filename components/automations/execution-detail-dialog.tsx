"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RiCheckDoubleLine,
  RiCloseCircleLine,
  RiTimeLine,
  RiLoader4Line,
  RiErrorWarningLine,
  RiFlowChart,
  RiStopCircleLine,
} from "@remixicon/react";
import { fetchN8nExecutionDetail, stopN8nExecution } from "@/lib/n8n/client";
import type { N8nExecutionDetail } from "@/lib/n8n/types";
import { toast } from "sonner";

interface ExecutionDetailDialogProps {
  executionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onExecutionStopped?: () => void;
}

export function ExecutionDetailDialog({
  executionId,
  isOpen,
  onClose,
  onExecutionStopped,
}: ExecutionDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [detail, setDetail] = useState<N8nExecutionDetail | null>(null);

  useEffect(() => {
    if (isOpen && executionId) {
      setLoading(true);
      fetchN8nExecutionDetail(executionId)
        .then((data) => {
          setDetail(data);
        })
        .catch((err) => {
          console.error("Greška pri dohvatanju detalja:", err);
          toast.error("Nije uspjelo dohvatanje detalja egzekucije.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDetail(null);
    }
  }, [isOpen, executionId]);

  const handleStop = async () => {
    if (!executionId) return;
    setStopping(true);
    toast.loading(`Zaustavljanje egzekucije #${executionId}...`, { id: "stop-exec" });
    const res = await stopN8nExecution(executionId);
    setStopping(false);

    if (res.success) {
      toast.success(res.message, { id: "stop-exec" });
      onExecutionStopped?.();
      onClose();
    } else {
      toast.error(res.message, { id: "stop-exec" });
    }
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

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString("bs-BA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <RiFlowChart className="w-5 h-5 text-primary" />
              <DialogTitle className="text-lg font-bold">
                Egzekucija #{executionId}
              </DialogTitle>
            </div>
            {detail?.status && (
              <Badge
                variant="outline"
                className={`text-xs capitalize font-medium ${
                  detail.status === "success"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : detail.status === "running"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20 animate-pulse"
                    : detail.status === "error"
                    ? "bg-red-500/10 text-red-600 border-red-500/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {detail.status === "success"
                  ? "Uspješno završeno"
                  : detail.status === "running"
                  ? "U toku izvršavanja"
                  : detail.status === "error"
                  ? "Prijavljena greška"
                  : detail.status === "canceled"
                  ? "Zaustavljeno"
                  : detail.status}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Detaljan uvid u tok izvršavanja čvorova, trajanje i status povratnih podataka sa n8n platforme.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <RiLoader4Line className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Učitavanje detalja egzekucije sa n8n servera...</p>
          </div>
        ) : !detail ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nisu pronađeni podaci za odabranu egzekuciju.
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Meta info strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">Način pokretanja:</span>
                <span className="font-semibold text-foreground uppercase">{detail.mode}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Trajanje procesa:</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <RiTimeLine className="w-3.5 h-3.5 text-muted-foreground" />
                  {formatDuration(detail.durationMs)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Vrijeme početka:</span>
                <span className="font-medium text-foreground">{formatDateTime(detail.startedAt)}</span>
              </div>
            </div>

            {/* Error box if present */}
            {detail.error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-red-600 font-semibold">
                  <RiErrorWarningLine className="w-4 h-4 shrink-0" />
                  <span>Greška u čvoru: {detail.error.nodeName || "Sistemski čvor"}</span>
                </div>
                <p className="text-red-700 dark:text-red-300 font-mono text-[11px] bg-red-500/5 p-2.5 rounded-lg border border-red-500/10 break-words whitespace-pre-wrap">
                  {detail.error.message}
                </p>
                {detail.error.description && (
                  <p className="text-muted-foreground text-[11px]">
                    {detail.error.description}
                  </p>
                )}
              </div>
            )}

            {/* Nodes timeline / summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Izvršeni čvorovi ({detail.nodesRun.length})
                </h4>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {detail.nodesRun.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    Nema pojedinačnih podataka o čvorovima za ovu vrstu egzekucije.
                  </p>
                ) : (
                  detail.nodesRun.map((node, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                        node.hasError
                          ? "bg-red-500/5 border-red-500/20 text-red-600"
                          : "bg-background hover:bg-muted/30 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {node.hasError ? (
                          <RiCloseCircleLine className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <RiCheckDoubleLine className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <span className="font-medium text-foreground truncate">
                          {node.nodeName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {node.executionTime !== undefined && node.executionTime > 0 && (
                          <span className="text-muted-foreground text-[11px]">
                            {node.executionTime}ms
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 ${
                            node.hasError
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          }`}
                        >
                          {node.hasError ? "Greška" : "OK"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Button variant="outline" size="sm" onClick={onClose}>
                Zatvori
              </Button>
              {detail.status === "running" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStop}
                  disabled={stopping}
                  className="gap-1.5"
                >
                  <RiStopCircleLine className="w-4 h-4" />
                  {stopping ? "Zaustavljanje..." : "Zaustavi egzekuciju"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
