"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";

import { CARD_RATIO, videoFrameToCardCanvas } from "@/lib/ocr/scan-card";
import { Button } from "@/components/ui/button";

type Props = {
  onCapture: (cardCanvas: HTMLCanvasElement) => void;
  /** La cámara falló o el usuario prefiere subir una foto en su lugar. */
  onFallback: () => void;
};

/**
 * Vista de cámara en vivo con una guía del tamaño de una carta: el usuario
 * encuadra la carta dentro del recuadro y toca "Capturar". Como el visor ES el
 * recorte (mismo `aspect-ratio` + `object-fit: cover` en la vista que en
 * `videoFrameToCardCanvas`), lo que se ve dentro de la guía es exactamente lo
 * que se captura — no hace falta ajustar nada después.
 */
export function CardLiveCapture({ onCapture, onFallback }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      onFallback();
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" } },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sólo se abre la cámara una vez por montaje
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = videoFrameToCardCanvas(video);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(canvas);
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
        Encuadra la carta dentro del recuadro, sin mesa ni fondo alrededor, y
        toca «Capturar».
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
          disabled={!ready}
          onClick={capture}
          className="gap-1.5"
        >
          <Camera className="size-4" />
          Capturar
        </Button>
      </div>
    </div>
  );
}
