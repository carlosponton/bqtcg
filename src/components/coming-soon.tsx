type Props = {
  title: string;
  description: string;
};

/** Placeholder para secciones que llegan en la Fase 1. */
export function ComingSoon({ title, description }: Props) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-center">
      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
        Próximamente
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-pretty">{description}</p>
    </div>
  );
}
