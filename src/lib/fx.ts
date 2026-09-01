import "server-only";

/**
 * Tasa de cambio USD → COP para el "precio de referencia" de TCGplayer.
 *
 * Fuente: open.er-api.com (sin API key, ~1 actualización al día). Se cachea en
 * memoria 12 h. Si la consulta falla se reutiliza el último valor conocido y,
 * si no hay ninguno, `FX_COP_PER_USD` de `.env`; si tampoco está, se devuelve
 * `null` y el precio de referencia simplemente no se muestra.
 */

const TTL_MS = 1000 * 60 * 60 * 12;
const SOURCE = "https://open.er-api.com/v6/latest/USD";

const ENV_RATE = (() => {
  const n = Number(process.env.FX_COP_PER_USD);
  return Number.isFinite(n) && n > 0 ? n : null;
})();

let cache: { at: number; rate: number } | null = null;
let inflight: Promise<number | null> | null = null;

async function fetchRate(): Promise<number | null> {
  try {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const cop = data.result === "success" ? data.rates?.COP : undefined;
    return typeof cop === "number" && cop > 0 ? cop : null;
  } catch {
    return null;
  }
}

/** Pesos colombianos por 1 dólar, o `null` si no se pudo determinar. */
export async function getUsdToCop(): Promise<number | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rate;
  if (!inflight) {
    inflight = fetchRate()
      .then((rate) => {
        if (rate != null) cache = { at: Date.now(), rate };
        return rate ?? cache?.rate ?? ENV_RATE;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
