"use client";

import * as React from "react";
import type { EmailLog } from "@/lib/appwrite/emails";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiMailLine,
  RiSearchLine,
  RiFilter3Line,
  RiEyeLine,
  RiBuilding2Line,
  RiCalendarEventLine,
  RiCheckDoubleLine,
  RiDraftLine,
  RiFileCopyLine,
  RiSendPlane2Line,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
} from "@remixicon/react";
import { toast } from "sonner";

interface EmailLogsViewProps {
  initialLogs: EmailLog[];
}

export function EmailLogsView({ initialLogs }: EmailLogsViewProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedEmail, setSelectedEmail] = React.useState<EmailLog | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Normalization for search
  const normalize = (str: string) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/["'„”«»\-_.,()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const filteredLogs = React.useMemo(() => {
    const q = normalize(searchTerm);
    return initialLogs.filter((log) => {
      // Status match
      if (statusFilter !== "all" && log.status !== statusFilter) {
        return false;
      }

      // Query match
      if (!q) return true;

      const compName = normalize(log.companyName);
      const email = normalize(log.companyEmail);
      const city = normalize(log.companyCity || "");
      const subject = normalize(log.subject);
      const body = normalize(log.body);
      const statusText = normalize(log.status);

      return (
        compName.includes(q) ||
        email.includes(q) ||
        city.includes(q) ||
        subject.includes(q) ||
        body.includes(q) ||
        statusText.includes(q)
      );
    });
  }, [initialLogs, searchTerm, statusFilter]);

  const handleOpenEmail = (email: EmailLog) => {
    setSelectedEmail(email);
    setDialogOpen(true);
  };

  const handleCopyBody = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Sadržaj emaila je kopiran u međuspremnik.");
  };

  const getStatusBadge = (status: EmailLog["status"]) => {
    switch (status) {
      case "Otvoreno":
        return (
          <Badge
            variant="outline"
            className="text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30 text-xs font-medium"
          >
            Otvoreno
          </Badge>
        );
      case "Odgovoreno":
        return (
          <Badge
            variant="outline"
            className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 text-xs font-medium"
          >
            Odgovoreno
          </Badge>
        );
      case "Bez odgovora":
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground bg-muted/60 border-border text-xs font-medium"
          >
            Bez odgovora
          </Badge>
        );
      case "Greška":
        return (
          <Badge
            variant="outline"
            className="text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30 text-xs font-medium"
          >
            Greška
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-primary bg-primary/10 border-primary/30 text-xs font-medium"
          >
            Poslano
          </Badge>
        );
    }
  };

  // Quick stats summary
  const totalCount = initialLogs.length;
  const openedCount = initialLogs.filter((l) => l.status === "Otvoreno").length;
  const answeredCount = initialLogs.filter((l) => l.status === "Odgovoreno").length;
  const sentCount = initialLogs.filter((l) => l.status === "Poslano").length;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header & Filter Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Email Log i Outreach
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pregled svih poslanih cold emailova i njihovih statusa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs h-9 cursor-pointer">
                <RiFilter3Line className="size-4" />
                <span>
                  {statusFilter === "all" ? "Filteri" : `Status: ${statusFilter}`}
                </span>
                {statusFilter !== "all" && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Filtriraj po statusu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs cursor-pointer justify-between"
                onClick={() => setStatusFilter("all")}
              >
                Svi statusi
                {statusFilter === "all" && <RiCheckboxCircleLine className="size-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs cursor-pointer justify-between"
                onClick={() => setStatusFilter("Poslano")}
              >
                Poslano
                {statusFilter === "Poslano" && <RiCheckboxCircleLine className="size-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs cursor-pointer justify-between"
                onClick={() => setStatusFilter("Otvoreno")}
              >
                Otvoreno
                {statusFilter === "Otvoreno" && <RiCheckboxCircleLine className="size-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs cursor-pointer justify-between"
                onClick={() => setStatusFilter("Odgovoreno")}
              >
                Odgovoreno
                {statusFilter === "Odgovoreno" && <RiCheckboxCircleLine className="size-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs cursor-pointer justify-between"
                onClick={() => setStatusFilter("Bez odgovora")}
              >
                Bez odgovora
                {statusFilter === "Bez odgovora" && <RiCheckboxCircleLine className="size-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs cursor-pointer justify-between"
                onClick={() => setStatusFilter("Greška")}
              >
                Greška
                {statusFilter === "Greška" && <RiCheckboxCircleLine className="size-4 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md w-full">
        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Pretraži po primaocu, firmi ili naslovu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-10 text-xs w-full bg-background border-border"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            Poništi
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-x-auto w-full max-w-full">
        <Table className="min-w-[900px] w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40 border-b border-border">
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[220px]">
                Firma / Primalac
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[340px]">
                Naslov Emaila
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[120px]">
                Status
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider min-w-[140px]">
                Datum
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider text-right min-w-[60px]">
                {/* Actions */}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <RiMailLine className="size-8 opacity-40" />
                    <p className="font-medium text-sm text-foreground">
                      Nema pronađenih email zapisa
                    </p>
                    <p className="text-xs">
                      {searchTerm || statusFilter !== "all"
                        ? "Pokušajte prilagoditi pretragu ili poništiti filter."
                        : "Trenutno nema evidentiranih cold emailova u sistemu."}
                    </p>
                    {(searchTerm || statusFilter !== "all") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                        }}
                        className="mt-2 text-xs"
                      >
                        Resetuj filtere
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow
                  key={log.$id}
                  className="hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => handleOpenEmail(log)}
                >
                  {/* Firma / Primalac */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <RiBuilding2Line className="size-3.5 text-muted-foreground" />
                        {log.companyName}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {log.companyEmail}
                      </span>
                    </div>
                  </TableCell>

                  {/* Naslov Emaila & Snippet */}
                  <TableCell>
                    <div className="flex flex-col gap-1 max-w-md">
                      <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                        <RiMailLine className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{log.subject}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate leading-relaxed">
                        {log.preview}
                      </p>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>{getStatusBadge(log.status)}</TableCell>

                  {/* Datum */}
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {log.sentAt}
                  </TableCell>

                  {/* Akcije */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-primary cursor-pointer"
                      title="Pregledaj puni email"
                      onClick={() => handleOpenEmail(log)}
                    >
                      <RiEyeLine className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          Prikazano <span className="font-semibold text-foreground">{filteredLogs.length}</span> od{" "}
          <span className="font-semibold text-foreground">{totalCount}</span> emailova
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span>Otvoreno: <strong className="text-purple-600 dark:text-purple-400">{openedCount}</strong></span>
          <span>Odgovoreno: <strong className="text-emerald-600 dark:text-emerald-400">{answeredCount}</strong></span>
          <span>Poslano: <strong className="text-primary">{sentCount}</strong></span>
        </div>
      </div>

      {/* Email Details Modal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 mb-1 pr-8">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <RiMailLine className="size-4" />
                </div>
                <DialogTitle className="text-base font-bold">
                  Detalji poslanog emaila
                </DialogTitle>
              </div>
              {selectedEmail && (
                <div className="shrink-0">
                  {getStatusBadge(selectedEmail.status)}
                </div>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground pr-8">
              Zabilježeni podaci o outreach komunikaciji i isporučenom sadržaju.
            </DialogDescription>
          </DialogHeader>

          {selectedEmail && (
            <div className="space-y-4 py-2 text-xs">
              {/* Recipient & Metadata box */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Primalac:</span>
                  <span className="font-semibold text-foreground font-mono">
                    {selectedEmail.companyEmail}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Kompanija:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <RiBuilding2Line className="size-3.5 text-muted-foreground" />
                    {selectedEmail.companyName}
                    {selectedEmail.companyCity && ` (${selectedEmail.companyCity})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vrijeme slanja:</span>
                  <span className="font-medium text-foreground flex items-center gap-1 font-mono">
                    <RiCalendarEventLine className="size-3.5 text-muted-foreground" />
                    {selectedEmail.sentAt}
                  </span>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Naslov poruke (Subject)
                </label>
                <div className="p-2.5 rounded-lg bg-background border border-border font-medium text-foreground">
                  {selectedEmail.subject}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                    Sadržaj emaila
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyBody(selectedEmail.body)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RiFileCopyLine className="size-3" />
                    Kopiraj tekst
                  </button>
                </div>
                <div className="p-3.5 rounded-lg bg-background border border-border text-foreground leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto">
                  {selectedEmail.body}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="text-xs cursor-pointer"
            >
              Zatvori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
