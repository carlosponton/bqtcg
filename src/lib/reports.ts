/** Motivos de reporte (compartido client/server). */
export const REPORT_REASONS = [
  { value: "scam", label: "Estafa o no cumplió con el trato" },
  { value: "fake", label: "Carta falsa o no coincide con lo publicado" },
  { value: "inappropriate", label: "Contenido ofensivo o inapropiado" },
  { value: "spam", label: "Spam o publicación repetida" },
  { value: "other", label: "Otro" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value) as [
  ReportReason,
  ...ReportReason[],
];
