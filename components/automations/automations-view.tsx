"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  RiErrorWarningLine, 
  RiPauseCircleLine, 
  RiRefreshLine,
  RiCheckboxCircleLine,
  RiInformationLine
} from "@remixicon/react";
import { toast } from "sonner";

export function AutomationsView() {
  const [isActive, setIsActive] = useState(true);

  const toggleStatus = () => {
    setIsActive(!isActive);
    if (!isActive) {
      toast.success("Ciklus aktiviran.");
    } else {
      toast.info("Ciklus uspješno pauziran.");
    }
  };

  const runManual = () => {
    toast.error("Ova funkcija još nije povezana sa n8n sistemom.");
  };

  return (
    <div className="h-full flex-1 flex-col space-y-6 p-8 flex">
      {/* Banner */}
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 flex items-start gap-3">
        <RiErrorWarningLine className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-500">Prototip Interfejsa</h4>
          <p className="text-xs text-yellow-700/90 dark:text-yellow-500/90 mt-0.5">
            Ova stranica trenutno služi samo kao vizuelni prikaz (UI dizajn) i nije povezana sa pravim n8n procesima na bazi.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kontrolna tabla automatizacije</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Nadzor n8n workflow ciklusa i pregled logova.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            onClick={toggleStatus}
          >
            <RiPauseCircleLine className="w-4 h-4 mr-2" />
            {isActive ? "Pauziraj ciklus" : "Aktiviraj ciklus"}
          </Button>
          <Button 
            onClick={runManual}
          >
            <RiRefreshLine className="w-4 h-4 mr-2" />
            Pokreni ručno (POST)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full shrink-0">
              <RiRefreshLine className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Status servisa</p>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">n8n je aktivan</h3>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium mb-1">Sljedeće pokretanje</p>
            <h3 className="text-lg font-bold text-foreground">07:44</h3>
            <p className="text-xs text-muted-foreground mt-1">Svakih 30 minuta tokom radnog vremena</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium mb-1">Obrađeno danas</p>
            <h3 className="text-lg font-bold text-foreground">156 firmi</h3>
            <p className="text-xs text-red-500 font-medium mt-1">2 grešaka detektovano</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Section */}
      <Card className="border shadow-sm flex-1 mb-8">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-base">Sistemski Logovi</h3>
          <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">Prikaz posljednjih događaja</span>
        </div>
        <div className="p-0">
          <div className="divide-y">
            
            {/* Log Item 1 */}
            <div className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
              <RiCheckboxCircleLine className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Ciklus uspješno završen. Obrađeno 45 leadova.</p>
                <p className="text-xs text-muted-foreground">21.08.2026 07:14:10</p>
              </div>
            </div>

            {/* Log Item 2 */}
            <div className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
              <RiInformationLine className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Webhook trigger aktiviran (Novi lead iz forme).</p>
                <p className="text-xs text-muted-foreground">21.08.2026 07:04:10</p>
              </div>
            </div>

            {/* Log Item 3 */}
            <div className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
              <RiErrorWarningLine className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-2 w-full">
                <p className="text-sm font-medium text-red-600">Greška pri slanju WhatsApp poruke (Nevažeći broj).</p>
                <div className="bg-muted/50 p-2.5 rounded text-xs text-muted-foreground w-full">
                  Kompanija: Kafeterija Sarajevo, Broj: +3876100
                </div>
                <p className="text-xs text-muted-foreground">21.08.2026 05:29:10</p>
              </div>
            </div>

            {/* Log Item 4 */}
            <div className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
              <RiCheckboxCircleLine className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Email kampanja (Follow-up 2) uspješno poslata na 12 adresa.</p>
                <p className="text-xs text-muted-foreground">21.08.2026 03:29:10</p>
              </div>
            </div>

          </div>
        </div>
      </Card>

    </div>
  );
}
