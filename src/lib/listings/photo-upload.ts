import imageCompression from "browser-image-compression";

const ENDPOINT = "/api/listings/photos";

/**
 * Comprime a webp en el navegador y sube cada foto por el route handler
 * `/api/listings/photos` (auth de servidor: evita el 403 de RLS cuando el
 * cliente del navegador no tiene la sesión hidratada al subir a Storage).
 * Devuelve los `storage_path` en orden. El path es `{uid}/{grupo}/{i}.webp`.
 *
 * `userId` ya no se usa (el servidor lo deriva de la sesión) pero se mantiene en
 * la firma para no tocar los llamadores.
 */
export async function uploadListingPhotos(
  files: File[],
  userId: string,
  startIndex = 0,
): Promise<string[]> {
  void userId;
  const group = crypto.randomUUID();
  const paths: string[] = [];

  for (let i = 0; i < files.length; i++) {
    let blob: Blob = files[i];
    try {
      blob = await imageCompression(files[i], {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        fileType: "image/webp",
        useWebWorker: true,
      });
    } catch {
      // Si la compresión falla (p. ej. HEIC de iPhone en Chrome) se sube el
      // original; el route handler valida tipo y tamaño.
    }

    const form = new FormData();
    form.append("file", blob, `${startIndex + i}.webp`);
    form.append("group", group);
    form.append("index", String(startIndex + i));

    let res: Response;
    try {
      res = await fetch(ENDPOINT, { method: "POST", body: form });
    } catch {
      throw new Error("Sin conexión al subir la foto.");
    }

    const data: { path?: string; error?: string } = await res
      .json()
      .catch(() => ({}));
    if (!res.ok || !data.path) {
      throw new Error(data.error || `No se pudo subir la foto (${res.status}).`);
    }
    paths.push(data.path);
  }

  return paths;
}

/** Borra objetos del bucket (best-effort; no lanza). */
export async function removeStoragePhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await fetch(ENDPOINT, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });
  } catch {
    // orphans en Storage no rompen nada; se pueden limpiar luego.
  }
}
