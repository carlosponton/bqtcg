/**
 * Lectura centralizada de variables de entorno de Supabase.
 * Lanza un error claro (en vez de un fallo críptico más adelante) si faltan.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia .env.example a .env.local y complétala con los datos de tu proyecto Supabase (Project Settings → API Keys).`,
    );
  }
  return value;
}

export const SUPABASE_URL = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

/**
 * Publishable key (`sb_publishable_...`). Reemplaza a la antigua "anon key".
 * Es segura para el navegador; la seguridad real la da RLS.
 * Acepta también la legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` como respaldo.
 */
export const SUPABASE_PUBLISHABLE_KEY = () =>
  required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
