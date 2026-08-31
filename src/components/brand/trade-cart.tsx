import { cn } from "@/lib/utils";

/**
 * Ilustración plana y decorativa: una carretilla cargada de cajas de cartas,
 * con globos flotando. Usa variables del tema (`var(--muted)`, `currentColor`…)
 * para verse bien en claro y oscuro. Puramente estética.
 */
export function TradeCart({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 340"
      className={cn("h-auto w-full text-foreground", className)}
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="tc-balloon-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e63946" />
          <stop offset="1" stopColor="#f4a935" />
        </linearGradient>
        <linearGradient id="tc-balloon-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4a935" />
          <stop offset="1" stopColor="#e07a3f" />
        </linearGradient>
      </defs>

      <ellipse cx="212" cy="312" rx="150" ry="15" fill="currentColor" opacity="0.06" />

      {/* Cordeles + globos */}
      <g
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M120 150c-10 22-6 40 6 60" />
        <path d="M164 132c-4 26 4 44 14 62" />
        <path d="M96 176c-8 16-6 34 2 48" />
      </g>
      <ellipse cx="118" cy="118" rx="26" ry="31" fill="url(#tc-balloon-a)" />
      <ellipse cx="166" cy="104" rx="22" ry="26" fill="url(#tc-balloon-b)" />
      <ellipse cx="92" cy="150" rx="19" ry="23" fill="#e63946" />
      <path d="M114 148h8l-4 6z" fill="#f4a935" />
      <path d="M162 129h8l-4 6z" fill="#e07a3f" />
      <path d="M88 172h8l-4 6z" fill="#e63946" />
      <ellipse cx="110" cy="106" rx="6" ry="9" fill="#ffffff" opacity="0.35" />
      <ellipse cx="159" cy="94" rx="5" ry="7" fill="#ffffff" opacity="0.35" />

      {/* Caja de la carretilla */}
      <path
        d="M150 214h188l-24 60H176z"
        fill="var(--muted)"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Cajas de cartas */}
      <g stroke="#0000001f" strokeWidth="2">
        <rect x="196" y="150" width="70" height="78" rx="7" fill="#f4a935" />
        <rect x="174" y="176" width="60" height="66" rx="7" fill="#e63946" />
        <rect
          x="262"
          y="182"
          width="56"
          height="60"
          rx="7"
          fill="var(--card)"
          stroke="currentColor"
          strokeOpacity="0.4"
        />
      </g>
      <g stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2.4" fill="none">
        <rect x="212" y="166" width="30" height="42" rx="4" />
        <rect x="188" y="190" width="26" height="38" rx="4" />
      </g>
      <rect
        x="276"
        y="196"
        width="24"
        height="34"
        rx="4"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2.4"
        fill="none"
      />

      {/* Riel frontal */}
      <path
        d="M150 214h188l-6 15H154z"
        fill="var(--secondary)"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Pata, mango y horquilla */}
      <path
        d="M320 274l6 26"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M338 214l40-18"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M176 274l-14 20"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Rueda */}
      <circle cx="158" cy="296" r="30" fill="currentColor" opacity="0.85" />
      <circle cx="158" cy="296" r="17" fill="var(--card)" />
      <circle cx="158" cy="296" r="4.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" opacity="0.6">
        <path d="M158 279v34" />
        <path d="M141 296h34" />
      </g>

      {/* Destellos */}
      <g stroke="var(--gold)" strokeWidth="3" strokeLinecap="round">
        <path d="M300 120h10M305 115v10" />
        <path d="M60 100h8M64 96v8" />
        <path d="M356 150h8M360 146v8" />
      </g>
    </svg>
  );
}
