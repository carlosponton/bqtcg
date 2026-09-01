"use client";

import { useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";

import { scanCard, type ScanFields } from "@/lib/ocr/scan-card";
import { CardAlignCrop } from "@/components/cards/card-align-crop";
import { CardLiveCapture } from "@/components/cards/card-live-capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardThumb } from "@/components/cards/card-thumb";

type Picked = { id: string; name: string; image: string | null };

/** Candidata que devuelve `/api/cards/scan` (subconjunto de `ScanCandidate`). */
type Candidate = {
  id: string;
  localId?: string;
  name: string;
  image: string | null;
  setName: string | null;
};

// "camera": vista en vivo con guía (vía normal). "idle": subir una foto a
// mano (respaldo si la cámara falla, o si el usuario la prefiere).
type Stage = "camera" | "idle" | "align" | "ocr" | "review";

/**
 * Escáner de carta con la cámara. El OCR (Tesseract.js) corre 100 % en el
 * navegador; luego `/api/cards/scan` cruza lo leído con el catálogo. Siempre
 * muestra candidatas para confirmar: nunca elige solo.
 */
export function CardScanner({ onPick }: { onPick: (card: Picked) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("camera");
  const [photo, setPhoto] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [fields, setFields] = useState<ScanFields | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStage("camera");
    setPhoto(null);
    setProgress(0);
    setFields(null);
    setCandidates([]);
    setSearching(false);
    setError(null);
  }

  async function search(f: ScanFields) {
    setSearching(true);
    setError(null);
    const qs = new URLSearchParams();
    if (f.name) qs.set("name", f.name);
    if (f.number) qs.set("number", f.number);
    if (f.setTotal) qs.set("total", String(f.setTotal));
    if (f.setCode) qs.set("code", f.setCode);
    try {
      const res = await fetch(`/api/cards/scan?${qs.toString()}`);
      const data: { candidates?: Candidate[]; error?: string } =
        await res.json();
      if (!res.ok || data.error) {
        setCandidates([]);
        setError(data.error ?? "No se pudo consultar el catálogo.");
      } else {
        setCandidates(data.candidates ?? []);
      }
    } catch {
      setError("Sin conexión con el catálogo.");
    } finally {
      setSearching(false);
    }
  }

  function onFile(file: File) {
    setPhoto(file);
    setStage("align");
    setError(null);
  }

  async function onAligned(cardCanvas: HTMLCanvasElement) {
    setStage("ocr");
    setProgress(0);
    setError(null);
    setCandidates([]);
    try {
      const result = await scanCard(cardCanvas, setProgress);
      setFields(result);
      setStage("review");
      if (result.name || result.number) void search(result);
    } catch {
      setError(
        "No se pudo leer la carta. Prueba con más luz y encuadrando bien la carta.",
      );
      setStage("review");
      setFields({
        nameText: "",
        bottomText: "",
        name: null,
        number: null,
        setTotal: null,
        setCode: null,
        letter: null,
      });
    }
  }

  function edit(patch: Partial<ScanFields>) {
    setFields((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Camera className="size-4" />
          Escanear con la cámara
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escanear carta</DialogTitle>
          <DialogDescription>
            Encuadra la carta dentro de la guía y toca «Capturar». Se lee el
            nombre y el número (ej. 136/189) para buscarla en el catálogo.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />

        {stage === "camera" ? (
          <CardLiveCapture
            onCapture={(canvas) => void onAligned(canvas)}
            onFallback={() => setStage("idle")}
          />
        ) : null}

        {stage === "idle" ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Button type="button" onClick={() => fileRef.current?.click()}>
              <Camera className="size-4" />
              Tomar o elegir una foto
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No se pudo abrir la cámara en vivo (o preferiste subir una
              foto). Ajustarás el recuadro a mano en el paso siguiente. La
              foto se procesa en tu teléfono; no se sube a ningún lado.
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2"
              onClick={() => setStage("camera")}
            >
              Reintentar la cámara en vivo
            </button>
          </div>
        ) : null}

        {stage === "align" && photo ? (
          <CardAlignCrop
            file={photo}
            onConfirm={(canvas) => void onAligned(canvas)}
            onCancel={reset}
          />
        ) : null}

        {stage === "ocr" ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">Leyendo la carta…</p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              La primera vez descarga el motor de lectura (~4 MB).
            </p>
          </div>
        ) : null}

        {stage === "review" && fields ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <Label htmlFor="scan-name">Nombre</Label>
                <Input
                  id="scan-name"
                  value={fields.name ?? ""}
                  onChange={(e) => edit({ name: e.target.value || null })}
                  placeholder="Ej. Furret"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="scan-number">Número</Label>
                <Input
                  id="scan-number"
                  value={fields.number ?? ""}
                  onChange={(e) =>
                    edit({ number: e.target.value.toUpperCase() || null })
                  }
                  placeholder="136"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="scan-total">De (total)</Label>
                <Input
                  id="scan-total"
                  inputMode="numeric"
                  value={fields.setTotal ?? ""}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, ""));
                    edit({ setTotal: n > 0 ? n : null });
                  }}
                  placeholder="189"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={searching || (!fields.name && !fields.number)}
                onClick={() => void search(fields)}
              >
                <RefreshCw className="size-4" />
                Buscar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStage("camera")}
              >
                Otra foto
              </Button>
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            {searching ? (
              <p className="text-sm text-muted-foreground">Buscando…</p>
            ) : candidates.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Toca la carta correcta:
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onPick({ id: c.id, name: c.name, image: c.image });
                        setOpen(false);
                        reset();
                      }}
                      className="flex flex-col gap-1 rounded-md border p-1.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <CardThumb src={c.image} alt={c.name} className="w-full" />
                      <span className="line-clamp-2 text-[11px] leading-tight font-medium">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {c.localId}
                        {c.setName ? ` · ${c.setName}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : !error ? (
              <p className="text-sm text-muted-foreground">
                Sin coincidencias. Ajusta el nombre o el número y vuelve a
                buscar, o ciérralo y escríbela a mano.
              </p>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
