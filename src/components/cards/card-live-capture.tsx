"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";

import { CARD_RATIO, frameToCardCanvas } from "@/lib/ocr/scan-card";
import { Button } from "@/components/ui/button";

type Props = {
  onCapture: (cardCanvas: HTMLCanvasElement) => void;
  /** La cámara falló o el usuario prefiere subir una foto en su lugar. */
  onFallback: () => void;
};

/** ¿La foto de `takePhoto()` tiene un encuadre parecido al del stream? */
function sameFraming(a: number, b: number): boolean {
  return b > 0 && Math.abs(a - b) / b < 0.2;
}

/**
 * Vista de cámara en vivo con una guía del tamaño de una carta: el usuario
 * encuadra la carta dentro del recuadro y toca "Capturar". Como el visor ES el
 * recorte (mismo `aspect-ratio` + `object-fit: cover` en la vista que en
 * `frameToCardCanvas`), lo que se ve dentro de la guía es lo que se captura.
 *
 * Se pide la mayor resolución posible al stream y, en navegadores que lo
 * soportan (Chrome/Android), se usa `ImageCapture.takePhoto()` para tomar la
 * foto a la resolución del sensor — a baja resolución el OCR no leía el número.
 */
export function CardLiveCapture({ onCapture, onFallback }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      onFallback();
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) onFallback();
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la cámara se abre una vez por montaje
  }, []);

  async function grabHiRes(): Promise<HTMLVideoElement | ImageBitmap | null> {
    const video = videoRef.current;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!video || !video.videoWidth) return null;

    if (track && typeof ImageCapture !== "undefined") {
      try {
        const blob = await new ImageCapture(track).takePhoto();
        const bmp = await createImageBitmap(blob);
        // Sólo se usa si el encuadre no cambió mucho respecto al preview
        // (algunos sensores toman la foto con un campo de visión distinto).
        if (sameFraming(bmp.width / bmp.height, video.videoWidth / video.videoHeight)) {
          return bmp;
        }
        bmp.close?.();
      } catch {
        /* sin ImageCapture o falló: se usa el frame del <video> */
      }
    }
    return video;
  }

  async function capture() {
    if (busy) return;
    setBusy(true);
    try {
      const source = await grabHiRes();
      if (!source) return;
      const canvas = frameToCardCanvas(source);
      if ("close" in source) source.close?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture(canvas);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-lg bg-black"
        style={{ aspectRatio: CARD_RATIO }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-[4%] rounded-md border-2 border-white/85" />
        {!ready ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80">
            Abriendo la cámara…
          </div>
        ) : null}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Acerca la carta hasta llenar el recuadro (sin mesa ni fondo), enfoca
        bien y toca «Capturar».
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onFallback}
          className="gap-1.5"
        >
          <ImageUp className="size-4" />
          Subir foto en su lugar
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!ready || busy}
          onClick={capture}
          className="gap-1.5"
        >
          <Camera className="size-4" />
          {busy ? "Capturando…" : "Capturar"}
        </Button>
      </div>
    </div>
  );
}
