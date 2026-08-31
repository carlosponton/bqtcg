/**
 * Se ejecuta una vez al arrancar el servidor (Next.js).
 *
 * En WSL2 / algunas redes, Node resuelve IPv6 primero y las conexiones salientes
 * pueden fallar con ECONNREFUSED. Priorizar IPv4 lo evita.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { setDefaultResultOrder } = await import("node:dns");
      setDefaultResultOrder("ipv4first");
    } catch {
      // entorno sin este API: no pasa nada
    }
  }
}
