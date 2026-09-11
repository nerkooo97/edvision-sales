"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  RiSettings4Line,
  RiTimeLine,
  RiBuildingLine,
  RiShieldCheckLine,
  RiSaveLine,
  RiSparklingLine,
} from "@remixicon/react";
import { toast } from "sonner";

export interface ThrottleSettings {
  dailyLimit: number;
  delayMinutes: number;
}

export const DEFAULT_THROTTLE_SETTINGS: ThrottleSettings = {
  dailyLimit: 50,
  delayMinutes: 15,
};

interface ThrottleSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ThrottleSettings;
  onSave: (newSettings: ThrottleSettings) => Promise<void>;
}

export function ThrottleSettingsDialog({
  isOpen,
  onClose,
  settings,
  onSave,
}: ThrottleSettingsDialogProps) {
  const [dailyLimit, setDailyLimit] = useState<number>(settings.dailyLimit);
  const [delayMinutes, setDelayMinutes] = useState<number>(settings.delayMinutes);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDailyLimit(settings.dailyLimit);
    setDelayMinutes(settings.delayMinutes);
  }, [settings, isOpen]);

  const handleSave = async () => {
    const lim = Math.max(1, Math.min(50, Number(dailyLimit) || 50));
    const del = Math.max(10, Math.min(60, Number(delayMinutes) || 15));

    const newSettings = { dailyLimit: lim, delayMinutes: del };
    setIsSaving(true);
    try {
      await onSave(newSettings);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Spremanje postavki nije uspjelo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setDailyLimit(DEFAULT_THROTTLE_SETTINGS.dailyLimit);
    setDelayMinutes(DEFAULT_THROTTLE_SETTINGS.delayMinutes);
    toast.info("Vraćene zadane vrijednosti (50 firmi • 15 min pauza).");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <RiSettings4Line className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Podešavanja slanja i Warmup zaštita
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Prilagodite dinamiku slanja za zaštitu reputacije domene i SMTP servera.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Field 1: Daily Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-limit" className="text-xs font-semibold flex items-center gap-1.5">
                <RiBuildingLine className="w-3.5 h-3.5 text-primary" />
                Maksimalno kompanija po ciklusu (Dnevni limit)
              </Label>
              <Badge variant="outline" className="text-[11px] font-mono font-semibold">
                {dailyLimit} firmi
              </Badge>
            </div>

            <Input
              id="daily-limit"
              type="number"
              min={1}
              max={50}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseInt(e.target.value) || 0)}
              className="text-sm h-9"
              placeholder="npr. 25"
            />

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Brzi odabir:</span>
              {[10, 25, 40, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDailyLimit(val)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    dailyLimit === val
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Field 2: Delay in Minutes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="delay-minutes" className="text-xs font-semibold flex items-center gap-1.5">
                <RiTimeLine className="w-3.5 h-3.5 text-emerald-600" />
                Pauza između svakog poslanog emaila
              </Label>
              <Badge variant="outline" className="text-[11px] font-mono font-semibold">
                {delayMinutes} minuta
              </Badge>
            </div>

            <Input
              id="delay-minutes"
              type="number"
              min={10}
              max={60}
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
              className="text-sm h-9"
              placeholder="npr. 15"
            />

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Brzi odabir:</span>
              {[10, 15, 20, 30, 60].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDelayMinutes(val)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    delayMinutes === val
                      ? "bg-emerald-600 text-white border-emerald-600 font-medium"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {val}m
                </button>
              ))}
            </div>
          </div>

          {/* Warmup recommendation box */}
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
              <RiShieldCheckLine className="w-4 h-4" />
              <span>Preporuka za pouzdanu dostavu (Warmup)</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Za stabilnu reputaciju preporučuje se slanje <strong>20-30 emailova</strong> dnevno sa razmakom od <strong>10-15 minuta</strong>. n8n će automatski napraviti pauzu između svake obrade.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Vrati zadano (50 / 15m)
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="text-xs">
              Odustani
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="text-xs gap-1.5 bg-primary">
              <RiSaveLine className="w-3.5 h-3.5" />
              {isSaving ? "Spremanje..." : "Sačuvaj postavke"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
