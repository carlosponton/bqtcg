/**
 * OCR de una carta de Pokémon en el navegador (Tesseract.js, sin servidor).
 *
 * `tesseract.js` se carga con `import()` dinámico: sólo se descarga (~4 MB,
 * desde su CDN) cuando alguien usa el escáner. Nada de esto llega al servidor.
 *
 * En vez de una sola pasada sobre toda la carta, se leen por separado las dos
 * zonas útiles (el nombre arriba, el número/total/sigla en la banda inferior),
 * cada una recortada y ampliada. La distribución de una carta es fija, así que
 * estas fracciones sirven para la gran mayoría; ajústalas si hace falta.
 */

export type ScanFields = {
  nameText: string;
  bottomText: string;
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

type Region = { x: number; y: number; w: number; h: number };

/** Banda del nombre (arriba, casi todo el ancho). Fracciones 0–1. */
export const NAME_REGION: Region = { x: 0.03, y: 0.02, w: 0.94, h: 0.15 };
/** Banda inferior izquierda: número / total / sigla / ilustrador. */
export const BOTTOM_REGION: Region = { x: 0.0, y: 0.84, w: 0.66, h: 0.16 };

async function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() =>
    createImageBitmap(file),
  );
}

/** Recorta una zona, la escala a `outWidth` y la deja en gris con más contraste. */
function crop(bmp: ImageBitmap, r: Region, outWidth: number): HTMLCanvasElement {
  const sx = Math.round(bmp.width * r.x);
  const sy = Math.round(bmp.height * r.y);
  const sw = Math.max(1, Math.round(bmp.width * r.w));
  const sh = Math.max(1, Math.round(bmp.height * r.h));
  const scale = Math.max(1, outWidth / sw);
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = g < 115 ? Math.max(0, g - 28) : Math.min(255, g + 28);
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Palabras que descartan una línea como "nombre de la carta". */
const NOT_A_NAME =
  /\b(stage|basic|evolves|evoluciona|illus|ilustr|pok[eé]mon|trainer|entrenador|energy|energ[ií]a|ability|habilidad|weakness|debilidad|resistance|resistencia|retreat|retirada|puts?|deals?|attack|ataque)\b/i;

/** Número tipo "136/189" o "TG12/TG30" sin quedar pegado a otra palabra. */
const NUM_RE =
  /(?<![A-Za-z0-9])([A-Za-z]{0,3})\s?(\d{1,3})\s*[/／|]\s*([A-Za-z]{0,3})\s?(\d{1,3})(?![A-Za-z0-9])/;

/** Extrae nombre / número / total / sigla del texto de cada zona. */
export function parseCardText(nameText: string, bottomText = ""): ScanFields {
  const nameRaw = nameText.replace(/\r/g, "");
  const bottomRaw = bottomText.replace(/\r/g, "");

  // Número: primero en la banda inferior; si no aparece, en el texto del nombre.
  const num = bottomRaw.match(NUM_RE) ?? nameRaw.match(NUM_RE);
  const number = num
    ? `${num[1]}${num[2]}`.replace(/\s+/g, "").toUpperCase() || null
    : null;
  const setTotal = num && num[4] ? Number(num[4]) : null;

  // Sigla del set (Escarlata y Púrpura): 3–4 mayúsculas sueltas en la banda
  // inferior, descartando falsos positivos comunes.
  const SKIP_CODE = new Set(["ILL", "LVL", "POK", "NIL", "THE"]);
  const codes = (bottomRaw.match(/\b[A-Z]{3,4}\b/g) ?? []).filter(
    (c) => !SKIP_CODE.has(c),
  );
  const setCode = codes.length > 0 ? codes[codes.length - 1] : null;

  // Marca de reglamento: una letra D–H aislada, en la banda inferior.
  const reg = bottomRaw.match(/(?:^|\s)([D-H])(?:\s|$)/);
  const letter = reg ? reg[1] : null;

  // Nombre: la línea con más letras del recorte superior que no sea texto de
  // ataque/etapa.
  const clean = (l: string) =>
    l
      .replace(/\b(HP|PV)\b.*$/i, "")
      .replace(/\d.*$/, "")
      .replace(/[^A-Za-zÀ-ÿ '.\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const alphaLen = (s: string) => s.replace(/[^A-Za-zÀ-ÿ]/g, "").length;

  const lines = nameRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let nameLine = lines.find(
    (l) =>
      !NOT_A_NAME.test(l) && alphaLen(clean(l)) >= 3 && alphaLen(clean(l)) <= 26,
  );
  if (!nameLine) {
    nameLine = [...lines]
      .filter((l) => !NOT_A_NAME.test(l))
      .sort((a, b) => alphaLen(clean(b)) - alphaLen(clean(a)))[0];
  }
  const name = nameLine ? clean(nameLine) || null : null;

  return {
    nameText: nameRaw,
    bottomText: bottomRaw,
    name,
    number,
    setTotal,
    setCode,
    letter,
  };
}

/** Corre el OCR sobre las dos zonas de la foto y devuelve los campos parseados. */
export async function scanCard(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<ScanFields> {
  const [{ createWorker, PSM }, bmp] = await Promise.all([
    import("tesseract.js"),
    loadBitmap(file),
  ]);

  const nameCanvas = crop(bmp, NAME_REGION, 1100);
  const bottomCanvas = crop(bmp, BOTTOM_REGION, 1500);
  bmp.close?.();

  let step = 0;
  const report = (frac: number) => onProgress?.((step + frac) / 2);

  const worker = await createWorker(["spa", "eng"], undefined, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m.status === "recognizing text") report(m.progress ?? 0);
    },
  });

  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const nameText = (await worker.recognize(nameCanvas)).data.text ?? "";
    step = 1;

    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const bottomText = (await worker.recognize(bottomCanvas)).data.text ?? "";
    onProgress?.(1);

    return parseCardText(nameText, bottomText);
  } finally {
    await worker.terminate();
  }
}
