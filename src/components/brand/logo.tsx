import { cn } from "@/lib/utils";

/**
 * Isotipo de El Cambista TCG: un globo (rojo → dorado) cuyo cordel dibuja el
 * contorno de una carta. El contorno usa `currentColor`, así funciona en claro
 * y oscuro; el globo mantiene su degradado.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="El Cambista TCG"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="ecm-balloon"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0" stopColor="#e63946" />
          <stop offset="1" stopColor="#f4a935" />
        </linearGradient>
      </defs>
      {/* Carta */}
      <rect
        x="12.5"
        y="16"
        width="21"
        height="27"
        rx="3.5"
        stroke="currentColor"
        strokeWidth="2.6"
      />
      {/* Cordel del globo hasta la esquina de la carta */}
      <path
        d="M30 19.5C30 24 24 24 22.6 16.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Globo */}
      <ellipse cx="30" cy="9.5" rx="7.2" ry="8.6" fill="url(#ecm-balloon)" />
      <path d="M28.4 17.3h3.2L30 20z" fill="#f4a935" />
      <ellipse cx="27.3" cy="6.6" rx="1.7" ry="2.5" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}

/** Isotipo + logotipo. */
export function Logo({
  className,
  withWordmark = false,
  markClassName,
}: {
  className?: string;
  withWordmark?: boolean;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={cn("size-7", markClassName)} />
      {withWordmark ? (
        <span className="font-heading text-[15px] leading-none font-extrabold tracking-tighter">
          El Cambista <span className="text-primary">TCG</span>
        </span>
      ) : null}
    </span>
  );
}
