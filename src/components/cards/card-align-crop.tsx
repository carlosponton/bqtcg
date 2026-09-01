"use client";

import { useEffect, useRef, useState } from "react";

import { CARD_RATIO } from "@/lib/ocr/scan-card";
import { Button } from "@/components/ui/button";

const MIN_W = 0.15;

type Rect = { x: number; y: number; w: number; h: number }; // fracciones 0–1
type Drag = { mode: "move" | "resize"; startX: number; startY: number; rect: Rect };

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

type Props = {
  file: File;
  onConfirm: (cardCanvas: HTMLCanvasElement) => void;
  onCancel: () => void;
};

/**
 * Paso previo al OCR: el usuario ajusta un recuadro (proporción de una carta)
 * sobre su foto. Sin esto, si la carta no queda centrada o no llena el
 * encuadre, las zonas fijas de `scanCard` caían sobre mesa/fondo y el OCR
 * leía cualquier cosa. Todo en fracciones 0–1 relativas a la imagen mostrada,
 * así no depende de medir tamaños en pantalla.
 */
export function CardAlignCrop({ file, onConfirm, onCancel }: Props) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ratioInBox, setRatioInBox] = useState(CARD_RATIO); // w/h del recuadro, en fracción

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (!w || !h) return;
    const k = CARD_RATIO / (w / h); // w_frac/h_frac que da la proporción real de una carta
    setRatioInBox(k);
    let rw = 0.86;
    let rh = rw / k;
    if (rh > 0.92) {
      rh = 0.92;
      rw = rh * k;
    }
    setRect({ x: (1 - rw) / 2, y: (1 - rh) / 2, w: rw, h: rh });
  }

  function onPointerDownMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode: "move", startX: e.clientX, startY: e.clientY, rect };
  }

  function onPointerDownResize(e: React.PointerEvent<HTMLDivElement>) {
    if (!rect) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mode: "resize", startX: e.clientX, startY: e.clientY, rect };
  }

  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const box = boxRef.current;
    if (!drag || !box) return;
    const { width: bw, height: bh } = box.getBoundingClientRect();
    if (!bw || !bh) return;
    const dxF = (e.clientX - drag.startX) / bw;
    const dyF = (e.clientY - drag.startY) / bh;

    if (drag.mode === "move") {
      const x = clamp(drag.rect.x + dxF, 0, 1 - drag.rect.w);
      const y = clamp(drag.rect.y + dyF, 0, 1 - drag.rect.h);
      setRect({ ...drag.rect, x, y });
    } else {
      let w = clamp(drag.rect.w + dxF, MIN_W, 1 - drag.rect.x);
      let h = w / ratioInBox;
      if (drag.rect.y + h > 1) {
        h = 1 - drag.rect.y;
        w = h * ratioInBox;
      }
      setRect({ ...drag.rect, w, h });
    }
  }

  function onDragEnd() {
    dragRef.current = null;
  }

  async function confirm() {
    if (!rect) return;
    const bmp = await createImageBitmap(file, {
      imageOrientation: "from-image",
    }).catch(() => createImageBitmap(file));

    const sx = rect.x * bmp.width;
    const sy = rect.y * bmp.height;
    const sw = rect.w * bmp.width;
    const sh = rect.h * bmp.height;

    // Sigue la resolución nativa del recorte (hasta 2400 px) en vez de fijar
    // un ancho bajo: si no, la banda del número queda ilegible para el OCR.
    const outW = Math.round(Math.min(2400, Math.max(1200, sw)));
    const outH = Math.round(outW / CARD_RATIO);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, outW, outH);
    }
    bmp.close?.();

    onConfirm(canvas);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Ajusta el recuadro para que cubra sólo la carta, sin mesa ni fondo, y
        toca «Usar este recorte». Arrastra el círculo para cambiar el tamaño.
      </p>

      <div
        ref={boxRef}
        className="relative touch-none overflow-hidden rounded-md bg-muted select-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Foto tomada"
          draggable={false}
          onLoad={onImgLoad}
          className="block h-auto w-full select-none"
        />
        {rect ? (
          <div
            onPointerDown={onPointerDownMove}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            className="absolute cursor-move touch-none border-2 border-primary"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
            }}
          >
            <div
              onPointerDown={onPointerDownResize}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              className="absolute -bottom-2.5 -right-2.5 size-6 touch-none cursor-nwse-resize rounded-full border-2 border-background bg-primary"
            />
          </div>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!rect}
          onClick={() => void confirm()}
        >
          Usar este recorte
        </Button>
      </div>
    </div>
  );
}
