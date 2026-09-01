/**
 * OCR de una carta de Pokémon en el navegador (Tesseract.js, sin servidor).
 *
 * `tesseract.js` se carga con `import()` dinámico: sólo se descarga (~4 MB,
 * desde su CDN) cuando alguien usa el escáner. Nada de esto llega al servidor.
 */

export type ScanFields = {
  rawText: string;
  name: string | null;
  /** Número impreso (`localId`), ej. "136" o "TG12". */
  number: string | null;
  /** Denominador impreso, ej. 189. */
  setTotal: number | null;
  /** Sigla del set (Escarlata y Púrpura), ej. "OBF". */
  setCode: string | null;
  /** Marca de reglamento (D–H), sólo informativa. */
  letter: string | null;
};

/** Reduce y pasa a gris + contraste la foto antes del OCR (Tesseract va lento en imágenes grandes). */
async function prepareImage(file: File, maxWidth = 1400): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  }).catch(() => createImageBitmap(file));

  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = gray < 110 ? Math.max(0, gray - 25) : Math.min(255, gray + 25);
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Palabras que descartan una línea como "nombre de la carta". */
const NOT_A_NAME =
  /\b(stage|basic|evolves|evoluciona|illus|ilustr|pok[eé]mon|trainer|entrenador|energy|energ[ií]a|ability|habilidad|weakness|debilidad|resistance|resistencia|retreat|retirada|puts?|deals?|attack|ataque)\b/i;

/** Extrae nombre / número / total / sigla del texto que devolvió el OCR. */
export function parseCardText(text: string): ScanFields {
  const raw = text.replace(/\r/g, "");

  // Número tipo "136/189" o "TG12/TG30". Se exige que no venga pegado a otra
  // palabra (lookbehind/lookahead) para no capturar "…koizumi136".
  const num = raw.match(
    /(?<![A-Za-z0-9])([A-Za-z]{0,3})\s?(\d{1,3})\s*[/／|]\s*([A-Za-z]{0,3})\s?(\d{1,3})(?![A-Za-z0-9])/,
  );
  const number = num
    ? `${num[1]}${num[2]}`.replace(/\s+/g, "").toUpperCase() || null
    : null;
  const setTotal = num && num[4] ? Number(num[4]) : null;

  // Sigla del set (Escarlata y Púrpura): 3–4 mayúsculas sueltas, sin falsos
  // positivos comunes. Se toma la última que aparezca.
  const SKIP_CODE = new Set(["ILL", "LVL", "POK", "NIL"]);
  const codes = (raw.match(/\b[A-Z]{3,4}\b/g) ?? []).filter(
    (c) => !SKIP_CODE.has(c),
  );
  const setCode = codes.length > 0 ? codes[codes.length - 1] : null;

  // Marca de reglamento: una sola letra D–H aislada.
  const reg = raw.match(/(?:^|\s)([D-H])(?:\s|$)/);
  const letter = reg ? reg[1] : null;

  // Nombre: primera línea "de nombre" cerca del tope; si no, la de más letras.
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const clean = (l: string) =>
    l
      .replace(/\b(HP|PV)\b.*$/i, "")
      .replace(/\d.*$/, "")
      .replace(/[^A-Za-zÀ-ÿ '.\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const alphaLen = (s: string) => s.replace(/[^A-Za-zÀ-ÿ]/g, "").length;

  const head = lines.slice(0, Math.max(5, Math.ceil(lines.length * 0.4)));
  let nameLine = head.find(
    (l) => !NOT_A_NAME.test(l) && alphaLen(clean(l)) >= 3 && alphaLen(clean(l)) <= 26,
  );
  if (!nameLine) {
    nameLine = [...head]
      .filter((l) => !NOT_A_NAME.test(l))
      .sort((a, b) => alphaLen(clean(b)) - alphaLen(clean(a)))[0];
  }
  const name = nameLine ? clean(nameLine) || null : null;

  return { rawText: raw, name, number, setTotal, setCode, letter };
}

/** Corre el OCR sobre la foto y devuelve los campos parseados. */
export async function scanCard(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<ScanFields> {
  const [{ createWorker }, canvas] = await Promise.all([
    import("tesseract.js"),
    prepareImage(file),
  ]);

  const worker = await createWorker(["spa", "eng"], undefined, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(m.progress ?? 0);
      }
    },
  });

  try {
    const { data } = await worker.recognize(canvas);
    return parseCardText(data.text ?? "");
  } finally {
    await worker.terminate();
  }
}
