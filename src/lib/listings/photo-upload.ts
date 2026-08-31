import imageCompression from "browser-image-compression";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "listing-photos";

/**
 * Comprime a webp en el navegador y sube al bucket `listing-photos`.
 * Devuelve los `storage_path` en orden. La RLS de Storage exige que la primera
 * carpeta sea `auth.uid()`, por eso el path es `{userId}/{grupo}/{i}.webp`.
 */
export async function uploadListingPhotos(
  files: File[],
  userId: string,
  startIndex = 0,
): Promise<string[]> {
  const supabase = createClient();
  const group = crypto.randomUUID();
  const paths: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const blob = await imageCompression(files[i], {
      maxSizeMB: 1,
      maxWidthOrHeight: 1600,
      fileType: "image/webp",
      useWebWorker: true,
    });
    const path = `${userId}/${group}/${startIndex + i}.webp`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: "image/webp", upsert: true });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

/** Borra objetos del bucket (best-effort; no lanza). */
export async function removeStoragePhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await createClient().storage.from(BUCKET).remove(paths);
  } catch {
    // orphans en Storage no rompen nada; se pueden limpiar luego.
  }
}
