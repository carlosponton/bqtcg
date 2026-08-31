"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

import { submitReport } from "@/lib/reports/actions";
import { REPORT_REASONS } from "@/lib/reports";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  targetType: "listing" | "user";
  targetId: string;
  label?: string;
};

export function ReportDialog({ targetType, targetId, label = "Reportar" }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setReason("");
    setDetail("");
    setError(null);
    setDone(false);
    setPending(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Elige un motivo.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await submitReport({ targetType, targetId, reason, detail });
    setPending(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {targetType === "listing" ? "Reportar anuncio" : "Reportar usuario"}
          </DialogTitle>
          <DialogDescription>
            Cuéntanos qué pasa. Un moderador lo revisará; no se le avisa a la otra
            persona.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Gracias. Recibimos tu reporte y lo revisaremos.
            </p>
            <DialogClose asChild>
              <Button className="self-start">Cerrar</Button>
            </DialogClose>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-reason">Motivo</Label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Elige un motivo…</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-detail">Detalle (opcional)</Label>
              <Textarea
                id="report-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Qué pasó, cuándo, cualquier dato útil."
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Enviando…" : "Enviar reporte"}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
